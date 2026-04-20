// Core domain types for the NovaMind content pipeline.
//
// Design note: Contact carries four orthogonal routing dimensions
// (persona, seniorityTier, lifecycleStage, rfmScore) plus one
// analysis-only dimension (acquisitionSource). Keeping these separate
// lets the insight engine run cross-dimensional queries that a merged
// model could not support.

// ---------- Persona (what they do) ----------
export type PersonaId = "agency_founder" | "creative_director" | "junior_creative";

export interface Persona {
  id: PersonaId;
  name: string;
  role: string;
  ageRange: string;
  pains: string[];
  motivations: string[];
  copyAngle: string;
  preferredCTA: string;
  tone: string;
}

// ---------- Seniority Tier (how mature they are in that role) ----------
export type SeniorityTier = "emerging" | "established" | "veteran";

export interface SeniorityProfile {
  tier: SeniorityTier;
  yearsRange: string;
  mindset: string;
  firstLineAngle: string;
}

// ---------- Lifecycle Stage ----------
export type LifecycleStage =
  | "onboarding"
  | "retention"
  | "loyalty"
  | "churned";

// ---------- RFM Score ----------
export type RfmScore = "champion" | "engaged" | "at_risk" | "dormant";

// ---------- Acquisition Source ----------
export type AcquisitionSource =
  | "blog_organic"
  | "linkedin"
  | "referral"
  | "event"
  | "paid_ad";

// ---------- Content ----------
export interface BlogPost {
  id: string;
  topic: string;
  title: string;
  outline: string[];
  body: string;
  wordCount: number;
  createdAt: string;
}

export interface NewsletterVariant {
  personaId: PersonaId;
  subject: string;
  preheader: string;
  body: string;
  cta: { label: string; href: string };
  // Seniority-specific first line. Applied at distribution time by
  // swapping the first paragraph of `body` based on recipient tier.
  // Keeps LLM cost at 3 calls per blog instead of 9.
  firstLineByTier?: Record<SeniorityTier, string>;
}

export interface ContentPackage {
  id: string;
  topic: string;
  blog: BlogPost;
  newsletters: NewsletterVariant[];
  generatedBy: "claude" | "mock";
  createdAt: string;
}

// ---------- Contact ----------
export interface Contact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;

  // Raw fields from subscribe form
  jobTitle: string;
  yearsInRole: number;

  // Derived routing dimensions
  personaId: PersonaId;
  seniorityTier: SeniorityTier;
  lifecycleStage: LifecycleStage;
  rfmScore: RfmScore;

  // Metadata
  acquisitionSource: AcquisitionSource;
  subscribedAt: string;
  // Legacy field kept for HubSpot compatibility
  hubspotLifecycleStage?: "subscriber" | "lead" | "mql" | "customer";
}

// ---------- Activity events ----------
export type ActivityEventType =
  | "delivered"
  | "opened"
  | "clicked"
  | "unsubscribed"
  | "bounced";

export interface ActivityEvent {
  id: string;
  contactId: string;
  campaignId: string;
  eventType: ActivityEventType;
  occurredAt: string;
  // RFM monetary weight: opened=1, clicked=3, CTA clicked=5
  engagementWeight: number;
}

// ---------- Campaigns and metrics ----------
export interface Campaign {
  id: string;
  contentPackageId: string;
  blogTitle: string;
  newsletterId: string;
  personaId: PersonaId;
  recipientCount: number;
  sentAt: string;
  status: "sent" | "scheduled" | "failed";
}

export interface CampaignMetrics {
  campaignId: string;
  personaId: PersonaId;
  sent: number;
  delivered: number;
  opens: number;
  uniqueOpens: number;
  clicks: number;
  uniqueClicks: number;
  unsubscribes: number;
  bounces: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
  bounceRate: number;
  recordedAt: string;
}

// ---------- Insights ----------
export interface InsightReport {
  id: string;
  contentPackageId: string;
  summary: string;
  winners: string[];
  opportunities: string[];
  nextTopicSuggestions: string[];
  crossDimensionalFindings?: string[];
  generatedBy: "claude" | "mock";
  createdAt: string;
}

// ---------- Pipeline runs ----------
export interface PipelineRun {
  id: string;
  topic: string;
  contentPackageId: string;
  campaignIds: string[];
  insightReportId: string;
  durationMs: number;
  completedAt: string;
  segmentSnapshot?: {
    byLifecycle: Record<LifecycleStage, number>;
    byRfm: Record<RfmScore, number>;
    byTier: Record<SeniorityTier, number>;
  };
}
