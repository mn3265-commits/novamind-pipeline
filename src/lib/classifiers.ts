// Rule-based classifiers that derive routing labels from raw contact data
// and activity history.
//
// All classifiers are pure functions. The rules are deliberately simple
// and explainable. In production the title classifier would be swapped
// for an LLM-based classifier or an enrichment API like Clearbit, but
// the call sites here would not change.

import {
  ActivityEvent,
  Contact,
  LifecycleStage,
  PersonaId,
  RfmScore,
  SeniorityTier,
} from "./types";

// ============================================================
// PERSONA CLASSIFIER
// ============================================================
// Maps a raw job title string to one of three personas.
// Rule: most specific match wins; falls back to junior (safest default).

const FOUNDER_KEYWORDS = [
  "founder",
  "co-founder",
  "cofounder",
  "ceo",
  "principal",
  "owner",
  "managing director",
  "managing partner",
];

const CREATIVE_DIRECTOR_KEYWORDS = [
  "creative director",
  "head of creative",
  "design director",
  "art director",
  "ecd",
  "executive creative",
  "creative lead",
  "head of design",
  "design lead",
];

const JUNIOR_KEYWORDS = [
  "intern",
  "junior",
  "associate",
  "assistant",
  "coordinator",
  "trainee",
];

export function classifyPersona(jobTitle: string): PersonaId {
  const t = jobTitle.toLowerCase().trim();

  // Check founder first (most specific business signal)
  if (FOUNDER_KEYWORDS.some((k) => t.includes(k))) return "agency_founder";

  // Then creative director level
  if (CREATIVE_DIRECTOR_KEYWORDS.some((k) => t.includes(k)))
    return "creative_director";

  // Junior signals
  if (JUNIOR_KEYWORDS.some((k) => t.includes(k))) return "junior_creative";

  // Fallback: if they say "senior" or "lead" without director keywords,
  // treat as mid-senior IC, closer to creative director audience
  if (t.includes("senior") || t.includes("lead") || t.includes("manager"))
    return "creative_director";

  // Safest default
  return "junior_creative";
}

// ============================================================
// SENIORITY TIER CLASSIFIER
// ============================================================
// Uses two signals: keywords in title, and yearsInRole.
// Conflict resolution: title wins. In B2B, title is the signal someone
// chose to show the world, so it matters more for copy tone.

const VETERAN_TITLE_KEYWORDS = [
  "head of",
  "chief",
  "vp",
  "vice president",
  "executive",
  "principal",
  "managing",
  "ecd",
];

const EMERGING_TITLE_KEYWORDS = [
  "intern",
  "junior",
  "associate",
  "assistant",
  "trainee",
];

export function classifySeniority(
  jobTitle: string,
  yearsInRole: number
): SeniorityTier {
  const t = jobTitle.toLowerCase().trim();

  // Title wins on conflict (e.g., "Associate Creative Director" with 10 years
  // is still emerging for THIS role, even if total career is long)
  if (EMERGING_TITLE_KEYWORDS.some((k) => t.includes(k))) return "emerging";
  if (VETERAN_TITLE_KEYWORDS.some((k) => t.includes(k))) return "veteran";

  // No strong title signal, use years
  if (yearsInRole <= 3) return "emerging";
  if (yearsInRole >= 9) return "veteran";

  // Middle band
  return "established";
}

// ============================================================
// LIFECYCLE STAGE CLASSIFIER
// ============================================================
// Where the contact is in their NovaMind journey. Inputs:
//   - subscribedAt (determines tenure in days)
//   - activity events (determines engagement recency)
//
// Rules:
//   Onboarding: subscribed <= 30 days ago
//   Churned:    no engagement in last 60 days
//   Loyalty:    tenure > 180 days AND engaged in >= 60% of recent sends
//   Retention:  everyone else (default stable state)

const ONBOARDING_WINDOW_DAYS = 30;
const CHURN_WINDOW_DAYS = 60;
const LOYALTY_TENURE_DAYS = 180;
const LOYALTY_ENGAGEMENT_WINDOW_DAYS = 90;
const LOYALTY_ENGAGEMENT_THRESHOLD = 0.5;

export function classifyLifecycle(
  contact: Contact,
  events: ActivityEvent[]
): LifecycleStage {
  const now = Date.now();
  const subscribedAt = new Date(contact.subscribedAt).getTime();
  const tenureDays = (now - subscribedAt) / (1000 * 60 * 60 * 24);

  const contactEvents = events.filter((e) => e.contactId === contact.id);
  const engagementEvents = contactEvents.filter(
    (e) => e.eventType === "opened" || e.eventType === "clicked"
  );

  // Onboarding: brand new
  if (tenureDays <= ONBOARDING_WINDOW_DAYS) return "onboarding";

  // Churned: no engagement in the last 60 days
  const recentEngagement = engagementEvents.filter((e) => {
    const daysAgo = (now - new Date(e.occurredAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= CHURN_WINDOW_DAYS;
  });
  if (recentEngagement.length === 0) return "churned";

  // Loyalty: long tenure + high engagement rate in last 90 days
  if (tenureDays >= LOYALTY_TENURE_DAYS) {
    const recentDeliveries = contactEvents.filter((e) => {
      if (e.eventType !== "delivered") return false;
      const daysAgo = (now - new Date(e.occurredAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= LOYALTY_ENGAGEMENT_WINDOW_DAYS;
    });
    const recentEngagedDeliveries = engagementEvents.filter((e) => {
      const daysAgo = (now - new Date(e.occurredAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= LOYALTY_ENGAGEMENT_WINDOW_DAYS;
    });
    if (recentDeliveries.length > 0) {
      const engagementRate = recentEngagedDeliveries.length / recentDeliveries.length;
      if (engagementRate >= LOYALTY_ENGAGEMENT_THRESHOLD) return "loyalty";
    }
  }

  // Default stable state
  return "retention";
}

// ============================================================
// RFM SCORE CLASSIFIER
// ============================================================
// Three sub-scores (recency, frequency, monetary-as-engagement-weight),
// each 1-3, summed and bucketed. Deliberately uses 3-point scale (not
// classic 1-5) because our dataset is small (30 contacts). With 1-5
// the buckets would be too sparse to analyze.

const RFM_RECENCY_WINDOW_DAYS = 30;
const RFM_FREQUENCY_WINDOW_DAYS = 90;

export function calculateRFM(
  contact: Contact,
  events: ActivityEvent[]
): RfmScore {
  const now = Date.now();
  const contactEvents = events.filter((e) => e.contactId === contact.id);
  const engagement = contactEvents.filter(
    (e) => e.eventType === "opened" || e.eventType === "clicked"
  );

  // No engagement history at all => dormant by definition
  if (engagement.length === 0) return "dormant";

  // Recency score (1-3): how recently they engaged
  const mostRecent = engagement.reduce((latest, e) => {
    const t = new Date(e.occurredAt).getTime();
    return t > latest ? t : latest;
  }, 0);
  const daysSinceLast = (now - mostRecent) / (1000 * 60 * 60 * 24);
  let r = 1;
  if (daysSinceLast <= 14) r = 3;
  else if (daysSinceLast <= RFM_RECENCY_WINDOW_DAYS) r = 2;

  // Frequency score (1-3): how many engagement events in last 90 days
  const recentEngagement = engagement.filter((e) => {
    const daysAgo = (now - new Date(e.occurredAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= RFM_FREQUENCY_WINDOW_DAYS;
  });
  let f = 1;
  if (recentEngagement.length >= 6) f = 3;
  else if (recentEngagement.length >= 3) f = 2;

  // Monetary score (1-3): total engagement weight in last 90 days
  const totalWeight = recentEngagement.reduce(
    (sum, e) => sum + e.engagementWeight,
    0
  );
  let m = 1;
  if (totalWeight >= 15) m = 3;
  else if (totalWeight >= 6) m = 2;

  const total = r + f + m;

  // Map to 4 segments. Thresholds chosen so the distribution across a
  // healthy list is roughly 15% Champion, 35% Engaged, 30% At-Risk, 20% Dormant.
  if (total >= 8) return "champion";
  if (total >= 6) return "engaged";
  if (total >= 4) return "at_risk";
  return "dormant";
}

// ============================================================
// BATCH CLASSIFIER
// ============================================================
// Runs all classifiers for a single contact, given current events.
// Used after each pipeline run to refresh routing labels before the
// next run reads them.

export function reclassifyContact(
  contact: Contact,
  events: ActivityEvent[]
): Contact {
  const personaId = classifyPersona(contact.jobTitle);
  const seniorityTier = classifySeniority(contact.jobTitle, contact.yearsInRole);
  const lifecycleStage = classifyLifecycle(contact, events);
  const rfmScore = calculateRFM(contact, events);

  return {
    ...contact,
    personaId,
    seniorityTier,
    lifecycleStage,
    rfmScore,
  };
}
