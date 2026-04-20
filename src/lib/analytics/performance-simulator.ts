import { randomUUID } from "crypto";
import {
  ActivityEvent,
  CampaignMetrics,
  Contact,
  LifecycleStage,
  PersonaId,
  RfmScore,
  SeniorityTier,
} from "../types";

// Per-contact event simulator.
//
// The old version generated aggregate rates only. This version generates
// one event per contact per campaign, which is what makes the feedback
// loop possible: the next run's RFM and lifecycle classifiers read these
// events to re-bucket each contact.
//
// Engagement probability is driven by persona, seniority tier, AND the
// contact's current lifecycle stage + prior RFM score. A Champion is
// more likely to engage again than a Dormant. A Veteran is less likely
// to click than an Emerging. These multipliers make the simulator
// realistic enough to produce meaningful cohort insights.

// ============================================================
// Base engagement probabilities by persona
// ============================================================
// Calibrated loosely to public B2B newsletter benchmarks.

interface BaseProbabilities {
  deliver: number;  // 1 - bounceRate
  open: number;     // conditional on delivered
  click: number;    // conditional on opened
  unsubscribe: number; // conditional on delivered
}

const PERSONA_BASE: Record<PersonaId, BaseProbabilities> = {
  // Founders: lower open (busy), moderate CTR, low unsubscribe
  agency_founder: { deliver: 0.992, open: 0.32, click: 0.14, unsubscribe: 0.003 },
  // Creative directors: middle open, sharper CTR when angle lands
  creative_director: { deliver: 0.993, open: 0.37, click: 0.18, unsubscribe: 0.005 },
  // Juniors: highest open, highest CTR (love free templates)
  junior_creative: { deliver: 0.995, open: 0.50, click: 0.24, unsubscribe: 0.002 },
};

// ============================================================
// Tier multipliers
// ============================================================
// Emerging tier is hungriest (highest engagement).
// Veterans read but click less.

const TIER_MULTIPLIERS: Record<SeniorityTier, { open: number; click: number }> = {
  emerging: { open: 1.05, click: 1.15 },
  established: { open: 1.0, click: 1.0 },
  veteran: { open: 1.08, click: 0.65 }, // they read more but click less
};

// ============================================================
// Lifecycle multipliers
// ============================================================
// Current lifecycle stage influences whether they show up this week.

const LIFECYCLE_MULTIPLIERS: Record<LifecycleStage, { open: number; click: number }> = {
  onboarding: { open: 1.15, click: 1.10 }, // honeymoon phase
  retention: { open: 1.0, click: 1.0 },
  loyalty: { open: 1.20, click: 1.25 },   // most engaged
  churned: { open: 0.25, click: 0.15 },    // barely showing up
};

// ============================================================
// RFM multipliers
// ============================================================
// Current RFM score is the strongest short-term predictor.

const RFM_MULTIPLIERS: Record<RfmScore, { open: number; click: number }> = {
  champion: { open: 1.30, click: 1.40 },
  engaged: { open: 1.05, click: 1.05 },
  at_risk: { open: 0.70, click: 0.55 },
  dormant: { open: 0.35, click: 0.20 },
};

// ============================================================
// Per-contact event generator
// ============================================================
// Generates events for one contact for one campaign, based on that
// contact's current routing labels.

export function simulateContactEvents(
  contact: Contact,
  campaignId: string,
  sentAt: string
): ActivityEvent[] {
  const base = PERSONA_BASE[contact.personaId];
  const tier = TIER_MULTIPLIERS[contact.seniorityTier];
  const lifecycle = LIFECYCLE_MULTIPLIERS[contact.lifecycleStage];
  const rfm = RFM_MULTIPLIERS[contact.rfmScore];

  const events: ActivityEvent[] = [];
  const sentTime = new Date(sentAt).getTime();

  // Bounce check (rare, independent)
  if (Math.random() > base.deliver) {
    events.push(makeEvent(contact.id, campaignId, "bounced", sentTime, 0));
    return events;
  }

  // Delivered
  events.push(makeEvent(contact.id, campaignId, "delivered", sentTime, 0));

  // Open probability, capped at 0.95
  const openProb = Math.min(0.95, base.open * tier.open * lifecycle.open * rfm.open);
  if (Math.random() < openProb) {
    // Opens typically happen 30 minutes to 12 hours after send
    const openTime = sentTime + minutes(30 + Math.random() * 690);
    events.push(makeEvent(contact.id, campaignId, "opened", openTime, 1));

    // Click probability is conditional on open, capped at 0.8
    const clickProb = Math.min(0.8, base.click * tier.click * lifecycle.click * rfm.click);
    if (Math.random() < clickProb) {
      // Click happens shortly after open (under 10 min typical)
      const clickTime = openTime + minutes(Math.random() * 10);
      // Weight 3 for normal click, 5 for high-intent personas clicking
      // (rough proxy: founders clicking a demo CTA is more valuable)
      const weight = contact.personaId === "agency_founder" ? 5 : 3;
      events.push(makeEvent(contact.id, campaignId, "clicked", clickTime, weight));
    }
  }

  // Unsubscribe probability (independent of open)
  if (Math.random() < base.unsubscribe) {
    const unsubTime = sentTime + minutes(60 + Math.random() * 2000);
    events.push(makeEvent(contact.id, campaignId, "unsubscribed", unsubTime, 0));
  }

  return events;
}

function makeEvent(
  contactId: string,
  campaignId: string,
  eventType: ActivityEvent["eventType"],
  atMillis: number,
  weight: number
): ActivityEvent {
  return {
    id: `evt_${randomUUID().slice(0, 8)}`,
    contactId,
    campaignId,
    eventType,
    occurredAt: new Date(atMillis).toISOString(),
    engagementWeight: weight,
  };
}

function minutes(n: number): number {
  return n * 60 * 1000;
}

// ============================================================
// Metrics aggregator
// ============================================================
// Takes the per-contact events for a campaign and produces the
// aggregate CampaignMetrics object the dashboard reads.

export function aggregateMetrics(
  campaignId: string,
  personaId: PersonaId,
  events: ActivityEvent[],
  recipientCount: number
): CampaignMetrics {
  const campaignEvents = events.filter((e) => e.campaignId === campaignId);

  const bounces = campaignEvents.filter((e) => e.eventType === "bounced").length;
  const delivered = recipientCount - bounces;
  const opens = campaignEvents.filter((e) => e.eventType === "opened").length;
  const uniqueOpens = new Set(
    campaignEvents.filter((e) => e.eventType === "opened").map((e) => e.contactId)
  ).size;
  const clicks = campaignEvents.filter((e) => e.eventType === "clicked").length;
  const uniqueClicks = new Set(
    campaignEvents.filter((e) => e.eventType === "clicked").map((e) => e.contactId)
  ).size;
  const unsubscribes = campaignEvents.filter(
    (e) => e.eventType === "unsubscribed"
  ).length;

  // Simulate total-vs-unique multiplier for opens (people open multiple times)
  // Keep it realistic: total opens 1.3-1.7x unique
  const totalOpens = Math.round(uniqueOpens * (1.3 + Math.random() * 0.4));
  const totalClicks = Math.round(uniqueClicks * (1.1 + Math.random() * 0.3));

  return {
    campaignId,
    personaId,
    sent: recipientCount,
    delivered,
    opens: Math.max(totalOpens, opens),
    uniqueOpens,
    clicks: Math.max(totalClicks, clicks),
    uniqueClicks,
    unsubscribes,
    bounces,
    openRate: delivered > 0 ? round(uniqueOpens / delivered) : 0,
    clickRate: delivered > 0 ? round(uniqueClicks / delivered) : 0,
    unsubscribeRate: delivered > 0 ? round(unsubscribes / delivered) : 0,
    bounceRate: recipientCount > 0 ? round(bounces / recipientCount) : 0,
    recordedAt: new Date().toISOString(),
  };
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ============================================================
// Backfill: generate synthetic historical events for seeded contacts
// ============================================================
// Problem: when seed.ts runs, contacts have subscribedAt dates going
// back 340 days, but no event history. So every contact starts as
// "dormant, onboarding" (wrong).
//
// Solution: generate plausible historical engagement events for each
// contact based on their tenure. This gives the first pipeline run
// meaningful lifecycle and RFM states to work with.
//
// This is ONLY for the demo seed. In production, real events come from
// real email sends over time.

export function backfillHistoricalEvents(
  contacts: Contact[]
): ActivityEvent[] {
  const now = Date.now();
  const events: ActivityEvent[] = [];

  for (const contact of contacts) {
    const subscribedAt = new Date(contact.subscribedAt).getTime();
    const tenureDays = (now - subscribedAt) / (1000 * 60 * 60 * 24);

    // Brand new contacts have no history
    if (tenureDays < 7) continue;

    // Simulate weekly sends since subscribe. Each "fake campaign" gets
    // a synthetic campaign id.
    const weeksSinceSubscribe = Math.floor(tenureDays / 7);
    const simulatedSends = weeksSinceSubscribe; // no cap - send weekly through present

    // Each contact has a latent engagement level (drawn once).
    // This creates realistic variation: some contacts are just more
    // engaged than others regardless of persona.
    const latentEngagement = 0.3 + Math.random() * 0.5; // 0.3 to 0.8

    // 25% of long-tenure contacts go "disengaged" at some point — they stop
    // opening after a while. This gives us realistic churn dynamics for the demo.
    const disengaged = tenureDays > 120 && Math.random() < 0.25;
    const disengagedAfterWeeks = disengaged
      ? 4 + Math.floor(Math.random() * 6) // stop engaging after weeks 4-10
      : Infinity;

    const base = PERSONA_BASE[contact.personaId];
    const tier = TIER_MULTIPLIERS[contact.seniorityTier];
    // No lifecycle/rfm multiplier here (those are what we're trying to compute)
    const openProb = Math.min(0.95, base.open * tier.open * latentEngagement * 2);
    const clickProb = Math.min(0.8, base.click * tier.click * latentEngagement * 2);

    for (let i = 0; i < simulatedSends; i++) {
      const sendTime = subscribedAt + (i + 1) * 7 * 24 * 60 * 60 * 1000;
      if (sendTime > now) break;

      const fakeCampaignId = `historical_${contact.id}_${i}`;

      // Delivered
      events.push({
        id: `evt_${randomUUID().slice(0, 8)}`,
        contactId: contact.id,
        campaignId: fakeCampaignId,
        eventType: "delivered",
        occurredAt: new Date(sendTime).toISOString(),
        engagementWeight: 0,
      });

      // After week "disengagedAfterWeeks", contact stops engaging
      if (i >= disengagedAfterWeeks) continue;

      if (Math.random() < openProb) {
        const openTime = sendTime + minutes(30 + Math.random() * 690);
        events.push({
          id: `evt_${randomUUID().slice(0, 8)}`,
          contactId: contact.id,
          campaignId: fakeCampaignId,
          eventType: "opened",
          occurredAt: new Date(openTime).toISOString(),
          engagementWeight: 1,
        });

        if (Math.random() < clickProb) {
          const clickTime = openTime + minutes(Math.random() * 10);
          const weight = contact.personaId === "agency_founder" ? 5 : 3;
          events.push({
            id: `evt_${randomUUID().slice(0, 8)}`,
            contactId: contact.id,
            campaignId: fakeCampaignId,
            eventType: "clicked",
            occurredAt: new Date(clickTime).toISOString(),
            engagementWeight: weight,
          });
        }
      }
    }
  }

  return events;
}
