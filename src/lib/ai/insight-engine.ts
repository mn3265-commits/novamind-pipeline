import { randomUUID } from "crypto";
import {
  ActivityEvent,
  CampaignMetrics,
  Contact,
  InsightReport,
  LifecycleStage,
  PersonaId,
  RfmScore,
  SeniorityTier,
} from "../types";
import {
  PERSONAS,
  PERSONA_LABELS,
  SENIORITY_LABELS,
  LIFECYCLE_LABELS,
  RFM_LABELS,
} from "../personas";
import { db } from "../db/store";
import { completeJSON, hasLiveAI } from "./client";
import { insightPrompt } from "./prompts";

interface InsightResponse {
  summary: string;
  winners: string[];
  opportunities: string[];
  nextTopicSuggestions: string[];
  crossDimensionalFindings?: string[];
}

export async function generateInsightReport(
  contentPackageId: string,
  topic: string,
  metrics: CampaignMetrics[],
  contacts: Contact[]
): Promise<InsightReport> {
  const events = db.listEvents();
  const crossDimFindings = computeCrossDimensionalFindings(contacts, events);
  const metricsText = formatMetricsForPrompt(metrics);
  const crossDimText = formatCrossDimensionalForPrompt(crossDimFindings);

  let resp: InsightResponse;
  let generatedBy: "claude" | "mock";

  if (hasLiveAI()) {
    resp = await completeJSON<InsightResponse>(
      insightPrompt(topic, `${metricsText}\n\nCross-dimensional breakdown:\n${crossDimText}`),
      1500
    );
    generatedBy = "claude";
  } else {
    resp = buildMockInsight(topic, metrics, crossDimFindings);
    generatedBy = "mock";
  }

  return {
    id: randomUUID(),
    contentPackageId,
    summary: resp.summary,
    winners: resp.winners,
    opportunities: resp.opportunities,
    nextTopicSuggestions: resp.nextTopicSuggestions,
    crossDimensionalFindings: resp.crossDimensionalFindings || crossDimFindings.narrative,
    generatedBy,
    createdAt: new Date().toISOString(),
  };
}

// ============================================================
// Cross-dimensional analysis
// ============================================================
// This is the power move: compute engagement metrics broken down by
// dimensions that CUT ACROSS persona. These findings are what a merged
// persona+seniority model could never produce.

interface CrossDimensionalFindings {
  byTier: Record<SeniorityTier, { opens: number; clicks: number; sends: number }>;
  byLifecycle: Record<LifecycleStage, { opens: number; clicks: number; sends: number }>;
  byRfm: Record<RfmScore, { opens: number; clicks: number; sends: number }>;
  narrative: string[];
}

function computeCrossDimensionalFindings(
  contacts: Contact[],
  events: ActivityEvent[]
): CrossDimensionalFindings {
  const byTier: Record<SeniorityTier, { opens: number; clicks: number; sends: number }> = {
    emerging: { opens: 0, clicks: 0, sends: 0 },
    established: { opens: 0, clicks: 0, sends: 0 },
    veteran: { opens: 0, clicks: 0, sends: 0 },
  };
  const byLifecycle: Record<LifecycleStage, { opens: number; clicks: number; sends: number }> = {
    onboarding: { opens: 0, clicks: 0, sends: 0 },
    retention: { opens: 0, clicks: 0, sends: 0 },
    loyalty: { opens: 0, clicks: 0, sends: 0 },
    churned: { opens: 0, clicks: 0, sends: 0 },
  };
  const byRfm: Record<RfmScore, { opens: number; clicks: number; sends: number }> = {
    champion: { opens: 0, clicks: 0, sends: 0 },
    engaged: { opens: 0, clicks: 0, sends: 0 },
    at_risk: { opens: 0, clicks: 0, sends: 0 },
    dormant: { opens: 0, clicks: 0, sends: 0 },
  };

  // Only consider non-historical events (real pipeline events)
  const realEvents = events.filter((e) => !e.campaignId.startsWith("historical_"));
  const byContactId = new Map(contacts.map((c) => [c.id, c]));

  for (const event of realEvents) {
    const contact = byContactId.get(event.contactId);
    if (!contact) continue;

    const buckets = [
      byTier[contact.seniorityTier],
      byLifecycle[contact.lifecycleStage],
      byRfm[contact.rfmScore],
    ];

    for (const b of buckets) {
      if (event.eventType === "delivered") b.sends++;
      if (event.eventType === "opened") b.opens++;
      if (event.eventType === "clicked") b.clicks++;
    }
  }

  const narrative = buildNarrativeFindings(byTier, byLifecycle, byRfm);
  return { byTier, byLifecycle, byRfm, narrative };
}

function buildNarrativeFindings(
  byTier: Record<SeniorityTier, { opens: number; clicks: number; sends: number }>,
  byLifecycle: Record<LifecycleStage, { opens: number; clicks: number; sends: number }>,
  byRfm: Record<RfmScore, { opens: number; clicks: number; sends: number }>
): string[] {
  const findings: string[] = [];

  // Tier finding
  const tierRates = (Object.entries(byTier) as [SeniorityTier, typeof byTier[SeniorityTier]][])
    .filter(([, v]) => v.sends > 0)
    .map(([k, v]) => ({ tier: k, openRate: v.opens / v.sends, clickRate: v.clicks / v.sends }))
    .sort((a, b) => b.clickRate - a.clickRate);

  if (tierRates.length >= 2) {
    const top = tierRates[0];
    const bottom = tierRates[tierRates.length - 1];
    if (bottom.clickRate > 0) {
      const ratio = (top.clickRate / bottom.clickRate).toFixed(1);
      findings.push(
        `${SENIORITY_LABELS[top.tier]} tier clicks ${ratio}x more than ${SENIORITY_LABELS[bottom.tier]} across all personas (${pct(top.clickRate)} vs ${pct(bottom.clickRate)})`
      );
    }
  }

  // Lifecycle finding
  const lifecycleRates = (Object.entries(byLifecycle) as [LifecycleStage, typeof byLifecycle[LifecycleStage]][])
    .filter(([, v]) => v.sends > 0)
    .map(([k, v]) => ({ stage: k, clickRate: v.clicks / v.sends, sends: v.sends }))
    .sort((a, b) => b.clickRate - a.clickRate);

  if (lifecycleRates.length >= 2) {
    const loyalty = lifecycleRates.find((l) => l.stage === "loyalty");
    const onboarding = lifecycleRates.find((l) => l.stage === "onboarding");
    if (loyalty && onboarding && onboarding.clickRate > 0) {
      const ratio = (loyalty.clickRate / onboarding.clickRate).toFixed(1);
      findings.push(
        `Loyalty cohort converts ${ratio}x better than Onboarding (${pct(loyalty.clickRate)} vs ${pct(onboarding.clickRate)}) — the most valuable segment to protect`
      );
    }
  }

  // RFM finding
  const champions = byRfm.champion;
  const atRisk = byRfm.at_risk;
  if (champions.sends > 0 && atRisk.sends > 0) {
    const cRate = champions.clicks / champions.sends;
    const aRate = atRisk.clicks / atRisk.sends;
    if (aRate > 0) {
      const ratio = (cRate / aRate).toFixed(1);
      findings.push(
        `RFM Champions click ${ratio}x more than At-Risk contacts (${pct(cRate)} vs ${pct(aRate)}) — win-back campaigns should prioritize At-Risk before they slip to Dormant`
      );
    }
  }

  return findings;
}

// ============================================================
// Prompt formatting
// ============================================================

function formatMetricsForPrompt(metrics: CampaignMetrics[]): string {
  return metrics
    .map((m) => {
      const persona = PERSONAS.find((p) => p.id === m.personaId)!;
      return [
        `Persona: ${persona.name} (${m.personaId})`,
        `  Sent: ${m.sent}`,
        `  Delivered: ${m.delivered}`,
        `  Unique opens: ${m.uniqueOpens} (${pct(m.openRate)})`,
        `  Unique clicks: ${m.uniqueClicks} (${pct(m.clickRate)})`,
        `  Unsubscribes: ${m.unsubscribes} (${pct(m.unsubscribeRate)})`,
      ].join("\n");
    })
    .join("\n\n");
}

function formatCrossDimensionalForPrompt(f: CrossDimensionalFindings): string {
  const lines: string[] = [];

  lines.push("BY SENIORITY TIER (cuts across all personas):");
  for (const tier of ["emerging", "established", "veteran"] as SeniorityTier[]) {
    const b = f.byTier[tier];
    if (b.sends === 0) continue;
    lines.push(
      `  ${SENIORITY_LABELS[tier]}: ${b.sends} sends, ${pct(b.opens / b.sends)} open, ${pct(b.clicks / b.sends)} click`
    );
  }

  lines.push("\nBY LIFECYCLE STAGE:");
  for (const stage of ["onboarding", "retention", "loyalty", "churned"] as LifecycleStage[]) {
    const b = f.byLifecycle[stage];
    if (b.sends === 0) continue;
    lines.push(
      `  ${LIFECYCLE_LABELS[stage]}: ${b.sends} sends, ${pct(b.opens / b.sends)} open, ${pct(b.clicks / b.sends)} click`
    );
  }

  lines.push("\nBY RFM SCORE:");
  for (const rfm of ["champion", "engaged", "at_risk", "dormant"] as RfmScore[]) {
    const b = f.byRfm[rfm];
    if (b.sends === 0) continue;
    lines.push(
      `  ${RFM_LABELS[rfm]}: ${b.sends} sends, ${pct(b.opens / b.sends)} open, ${pct(b.clicks / b.sends)} click`
    );
  }

  return lines.join("\n");
}

function pct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

// ============================================================
// Mock insight (used when no API key)
// ============================================================

function buildMockInsight(
  topic: string,
  metrics: CampaignMetrics[],
  crossDim: CrossDimensionalFindings
): InsightResponse {
  const sorted = [...metrics].sort((a, b) => b.clickRate - a.clickRate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const bestName = PERSONA_LABELS[best.personaId] || best.personaId;
  const worstName = PERSONA_LABELS[worst.personaId] || worst.personaId;
  const ratio = (best.clickRate / Math.max(worst.clickRate, 0.0001)).toFixed(1);

  return {
    summary: `On "${topic}", ${bestName} out-clicked ${worstName} by ${ratio}x (${pct(best.clickRate)} vs ${pct(worst.clickRate)}). Opens were strong across the board, so the gap was message-to-action fit, not inbox placement. The cross-dimensional breakdown reveals patterns the persona view alone would miss.`,
    winners: [
      `${bestName} hit ${pct(best.clickRate)} CTR, the strongest of the run`,
      `Unsubscribes held under 1% across every persona, indicating healthy list hygiene`,
    ],
    opportunities: [
      `Test a visual case study angle for ${worstName} next run — the current copy under-delivered for this segment`,
      `Build a dedicated win-back sequence for contacts tagged At-Risk before they slip to Dormant`,
    ],
    nextTopicSuggestions: [
      "Three agency workflows worth automating this quarter",
      "The Friday ritual that saved one 14-person studio 22 hours a week",
      "How to run an AI-assisted client kickoff without losing the human touch",
    ],
    crossDimensionalFindings: crossDim.narrative,
  };
}
