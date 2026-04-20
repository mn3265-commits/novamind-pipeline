import { Persona, SeniorityProfile, SeniorityTier } from "./types";

// ---------- Personas (what they do) ----------
// Three orthogonal personas defined by role, not seniority.

export const PERSONAS: Persona[] = [
  {
    id: "agency_founder",
    name: "Maya the Agency Founder",
    role: "Founder and Principal at a small to mid-size creative agency",
    ageRange: "30-50",
    pains: [
      "Thin margins on retainer work",
      "Scaling client volume without scaling headcount",
      "Senior team burning time on low-leverage tasks",
    ],
    motivations: [
      "Protect creative quality while growing revenue",
      "Prove ROI on every new tool before rolling it out",
      "Stay ahead of larger, better-resourced agencies",
    ],
    copyAngle:
      "Business outcomes first. Lead with margin, retention, and competitive positioning. Proof points from comparable agencies land best.",
    preferredCTA: "Book a 20-minute demo",
    tone: "Confident, outcome-driven, respectful of her time. No hype.",
  },
  {
    id: "creative_director",
    name: "Devon the Creative Director",
    role: "Creative Director or Design Director at an agency",
    ageRange: "28-45",
    pains: [
      "AI outputs that feel generic and on-brand for nobody",
      "Junior work that needs heavy rework before client review",
      "Pressure to ship faster without losing craft",
    ],
    motivations: [
      "Keep the creative bar high",
      "Use AI as an amplifier, not a replacement",
      "Protect taste and originality across the team",
    ],
    copyAngle:
      "Craft and taste first. Position AI as an instrument that a skilled hand still plays. Avoid automation cliches. Show before-and-after creative work.",
    preferredCTA: "Read the founder interview",
    tone: "Thoughtful, senior, a little skeptical of buzzwords. Treats the reader as a peer.",
  },
  {
    id: "junior_creative",
    name: "Sam the Junior Creative",
    role: "Intern, junior designer, or associate at an agency",
    ageRange: "21-30",
    pains: [
      "Wants to ship senior-quality work without constant check-ins",
      "Afraid of asking dumb questions in Slack",
      "Worried AI will make the junior role disappear",
    ],
    motivations: [
      "Learn the craft and the business quickly",
      "Build a portfolio and a network",
      "Become the person on the team others come to for help",
    ],
    copyAngle:
      "AI as an on-demand mentor. Share templates, checklists, and the stuff seniors already know but nobody writes down. Friendly and practical, no jargon.",
    preferredCTA: "Grab the starter template pack",
    tone: "Encouraging, practical, a little warm. Short sentences. Light on agency jargon.",
  },
];

export function getPersona(id: string): Persona {
  const p = PERSONAS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown persona: ${id}`);
  return p;
}

// ---------- Seniority Tiers (how mature in role) ----------
// These cut across all three personas. A Veteran Founder and a
// Veteran Junior share a mindset (pragmatic, seen-it-all) even
// though the day-to-day couldn't be more different.

export const SENIORITY_PROFILES: Record<SeniorityTier, SeniorityProfile> = {
  emerging: {
    tier: "emerging",
    yearsRange: "0-3 years at this level",
    mindset:
      "Hungry to learn, building reputation, a little unsure, open to new tools and ideas",
    firstLineAngle:
      "Acknowledge they are still building. Speak to the moment of figuring things out. Offer something concrete they can try this week.",
  },
  established: {
    tier: "established",
    yearsRange: "3-8 years at this level",
    mindset:
      "Confident, running their function day-to-day, looking for efficiency and sharper tools",
    firstLineAngle:
      "Speak peer-to-peer. Lead with a specific outcome or number. No hand-holding, no over-explaining.",
  },
  veteran: {
    tier: "veteran",
    yearsRange: "8+ years at this level",
    mindset:
      "Seen enough hype cycles to be skeptical. Needs proof, not promises. Values their time deeply.",
    firstLineAngle:
      "Respect their experience. Open with something that signals you have seen what they have seen. Skip the tutorial energy.",
  },
};

export function getSeniorityProfile(tier: SeniorityTier): SeniorityProfile {
  return SENIORITY_PROFILES[tier];
}

// ---------- Human-readable labels (for UI) ----------

export const PERSONA_LABELS: Record<string, string> = {
  agency_founder: "Agency Founder",
  creative_director: "Creative Director",
  junior_creative: "Junior Creative",
};

export const SENIORITY_LABELS: Record<SeniorityTier, string> = {
  emerging: "Emerging",
  established: "Established",
  veteran: "Veteran",
};

export const LIFECYCLE_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  retention: "Retention",
  loyalty: "Loyalty",
  churned: "Churned",
};

export const RFM_LABELS: Record<string, string> = {
  champion: "Champion",
  engaged: "Engaged",
  at_risk: "At Risk",
  dormant: "Dormant",
};

export const ACQUISITION_LABELS: Record<string, string> = {
  blog_organic: "Blog (Organic)",
  linkedin: "LinkedIn",
  referral: "Referral",
  event: "Event",
  paid_ad: "Paid Ad",
};
