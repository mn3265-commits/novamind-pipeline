import { randomUUID } from "crypto";
import { PERSONAS } from "./personas";
import {
  ActivityEvent,
  Campaign,
  ContentPackage,
  Contact,
  LifecycleStage,
  NewsletterVariant,
  PersonaId,
  PipelineRun,
  RfmScore,
  SeniorityTier,
} from "./types";
import { generateContentPackage } from "./ai/content-generator";
import { generateInsightReport } from "./ai/insight-engine";
import { hubspot } from "./crm/hubspot-mock";
import {
  aggregateMetrics,
  simulateContactEvents,
} from "./analytics/performance-simulator";
import { db } from "./db/store";
import { reclassifyContact } from "./classifiers";

// End-to-end pipeline with feedback loop.
//
// Order of operations:
//   1. Generate content (blog + 3 persona newsletters)
//   2. For each persona: distribute to segment (respecting lifecycle stage)
//   3. Per-contact event simulation → store events
//   4. Aggregate metrics per campaign
//   5. Reclassify every contact based on updated events (feedback loop!)
//   6. Generate insight report using multi-dimensional metrics
//   7. Record run with segment snapshot
//
// Step 5 is the critical addition. After each run, contacts may move
// between lifecycle stages and RFM buckets. Next run reads the updated
// labels and routes accordingly.

export async function runPipeline(topic: string): Promise<{
  run: PipelineRun;
  contentPackage: ContentPackage;
}> {
  const start = Date.now();

  // 1. Generate content
      if (db.listContacts().length === 0) { const { autoSeed } = await import("./auto-seed"); await autoSeed(); }
  const contentPackage = await generateContentPackage(topic);
  db.saveContentPackage(contentPackage);

  // 2-4. Distribute, simulate events, aggregate metrics
  const campaignIds: string[] = [];
  for (const newsletter of contentPackage.newsletters) {
    const campaignId = await distributeAndMeasure(contentPackage, newsletter);
    if (campaignId) campaignIds.push(campaignId);
  }

  // 5. Reclassify all contacts based on updated event history
  reclassifyAllContacts();

  // 6. Generate insight report
  const metrics = campaignIds
    .map((id) => db.metricsForCampaign(id))
    .filter((m): m is NonNullable<typeof m> => !!m);
    if (db.listContacts().length === 0) { const { autoSeed } = await import("./auto-seed"); await autoSeed(); }
  const contacts = db.listContacts();
  const insight = await generateInsightReport(
    contentPackage.id,
    topic,
    metrics,
    contacts
  );
  db.saveInsight(insight);

  // 7. Record run with segment snapshot
  const run: PipelineRun = {
    id: randomUUID(),
    topic,
    contentPackageId: contentPackage.id,
    campaignIds,
    insightReportId: insight.id,
    durationMs: Date.now() - start,
    completedAt: new Date().toISOString(),
    segmentSnapshot: buildSegmentSnapshot(contacts),
  };
  db.saveRun(run);

  return { run, contentPackage };
}

// ============================================================
// Per-campaign distribution
// ============================================================
// Now routing-aware: only sends to contacts whose lifecycleStage is
// NOT churned. Churned contacts would get win-back messages in a
// real implementation (future work).

async function distributeAndMeasure(
  contentPackage: ContentPackage,
  newsletter: NewsletterVariant
): Promise<string | null> {
  const personaId = newsletter.personaId;
  const persona = PERSONAS.find((p) => p.id === personaId)!;

  // Get recipients and filter out churned contacts (lifecycle gate)
  const allRecipients = db.contactsByPersona(personaId);
  const recipients = allRecipients.filter(
    (c) => c.lifecycleStage !== "churned"
  );

  if (recipients.length === 0) {
    return null; // nothing to send
  }

  // Create marketing email in HubSpot
  const email = await hubspot.createMarketingEmail({
    name: `${contentPackage.blog.title} - ${persona.name}`,
    subject: newsletter.subject,
    preheader: newsletter.preheader,
    htmlBody: newsletterToHtml(newsletter, recipients[0].seniorityTier),
    personaSegmentId: personaId,
  });

  // Send receipt
  const receipt = await hubspot.sendMarketingEmail({
    emailId: email.id,
    personaSegmentId: personaId,
  });

  // Log campaign
  const campaign: Campaign = {
    id: randomUUID(),
    contentPackageId: contentPackage.id,
    blogTitle: contentPackage.blog.title,
    newsletterId: email.id,
    personaId,
    recipientCount: recipients.length,
    sentAt: receipt.sentAt,
    status: "sent",
  };
  db.saveCampaign(campaign);

  // Simulate per-contact events and store
  const allEvents: ActivityEvent[] = [];
  for (const contact of recipients) {
    const events = simulateContactEvents(contact, campaign.id, receipt.sentAt);
    allEvents.push(...events);
  }
  db.saveEvents(allEvents);

  // Aggregate metrics from events
  const metrics = aggregateMetrics(
    campaign.id,
    personaId,
    allEvents,
    recipients.length
  );
  db.saveMetrics(metrics);

  return campaign.id;
}

// ============================================================
// Reclassification step (the feedback loop heart)
// ============================================================

function reclassifyAllContacts() {
  const contacts = db.listContacts();
  const allEvents = db.listEvents();
  const updated = contacts.map((c) => reclassifyContact(c, allEvents));
  db.bulkUpdateContacts(updated);
}

// ============================================================
// Segment snapshot for the run record
// ============================================================

function buildSegmentSnapshot(contacts: Contact[]) {
  const byLifecycle: Record<LifecycleStage, number> = {
    onboarding: 0, retention: 0, loyalty: 0, churned: 0,
  };
  const byRfm: Record<RfmScore, number> = {
    champion: 0, engaged: 0, at_risk: 0, dormant: 0,
  };
  const byTier: Record<SeniorityTier, number> = {
    emerging: 0, established: 0, veteran: 0,
  };

  for (const c of contacts) {
    byLifecycle[c.lifecycleStage]++;
    byRfm[c.rfmScore]++;
    byTier[c.seniorityTier]++;
  }

  return { byLifecycle, byRfm, byTier };
}

// ============================================================
// Newsletter body → HTML (with seniority-aware first line swap)
// ============================================================
// If the newsletter has firstLineByTier, swap the opening line of body
// to match the recipient's tier. This is done at send time, per contact,
// so the same generated content serves all three tiers without extra
// LLM calls.

function newsletterToHtml(
  newsletter: NewsletterVariant,
  tier: SeniorityTier
): string {
  let body = newsletter.body;

  if (newsletter.firstLineByTier && newsletter.firstLineByTier[tier]) {
    // Swap the first paragraph
    const paragraphs = body.split(/\n\n+/);
    if (paragraphs.length > 0) {
      paragraphs[0] = newsletter.firstLineByTier[tier];
      body = paragraphs.join("\n\n");
    }
  }

  const html = body
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
  return `<div style="font-family: ui-sans-serif, system-ui, sans-serif; color: #111; max-width: 560px; margin: 0 auto;">
${html}
<p><a href="${newsletter.cta.href}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 10px 16px; border-radius: 6px; text-decoration: none;">${escapeHtml(newsletter.cta.label)}</a></p>
</div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
