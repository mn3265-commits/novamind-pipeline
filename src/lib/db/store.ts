import fs from "fs";
import path from "path";
import {
  ActivityEvent,
  Contact,
  ContentPackage,
  Campaign,
  CampaignMetrics,
  InsightReport,
  PipelineRun,
} from "../types";

interface StoreShape {
  contacts: Contact[];
  contentPackages: ContentPackage[];
  campaigns: Campaign[];
  metrics: CampaignMetrics[];
  insights: InsightReport[];
  runs: PipelineRun[];
  events: ActivityEvent[];
}

const EMPTY: StoreShape = {
  contacts: [],
  contentPackages: [],
  campaigns: [],
  metrics: [],
  insights: [],
  runs: [],
  events: [],
};

// In-memory fallback for Vercel (read-only filesystem)
let memoryStore: StoreShape = structuredClone(EMPTY);
const IS_VERCEL = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(EMPTY, null, 2));
  }
}

function read(): StoreShape {
  if (IS_VERCEL) return memoryStore;
  ensureFile();
  const raw = fs.readFileSync(STORE_PATH, "utf-8");
  try { return JSON.parse(raw) as StoreShape; } catch { return structuredClone(EMPTY); }
}

function write(data: StoreShape) {
  if (IS_VERCEL) { memoryStore = data; return; }
  ensureFile();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

export const db = {
  listContacts(): Contact[] { return read().contacts; },
  contactsByPersona(personaId: string): Contact[] { return read().contacts.filter((c) => c.personaId === personaId); },
  upsertContact(contact: Contact) { const data = read(); const i = data.contacts.findIndex((c) => c.email === contact.email); if (i >= 0) data.contacts[i] = contact; else data.contacts.push(contact); write(data); },
  seedContacts(contacts: Contact[]) { const data = read(); data.contacts = contacts; write(data); },
  saveContentPackage(pkg: ContentPackage) { const data = read(); data.contentPackages.unshift(pkg); write(data); },
  getContentPackage(id: string): ContentPackage | undefined { return read().contentPackages.find((p) => p.id === id); },
  listContentPackages(): ContentPackage[] { return read().contentPackages; },
  saveCampaign(c: Campaign) { const data = read(); data.campaigns.unshift(c); write(data); },
  listCampaigns(): Campaign[] { return read().campaigns; },
  campaignsForPackage(packageId: string): Campaign[] { return read().campaigns.filter((c) => c.contentPackageId === packageId); },
  saveMetrics(m: CampaignMetrics) { const data = read(); data.metrics.unshift(m); write(data); },
  listMetrics(): CampaignMetrics[] { return read().metrics; },
  metricsForCampaign(campaignId: string): CampaignMetrics | undefined { return read().metrics.find((m) => m.campaignId === campaignId); },
  saveInsight(i: InsightReport) { const data = read(); data.insights.unshift(i); write(data); },
  listInsights(): InsightReport[] { return read().insights; },
  insightForPackage(packageId: string): InsightReport | undefined { return read().insights.find((i) => i.contentPackageId === packageId); },
  saveRun(r: PipelineRun) { const data = read(); data.runs.unshift(r); write(data); },
  listRuns(): PipelineRun[] { return read().runs; },
  saveEvents(events: ActivityEvent[]) { if (events.length === 0) return; const data = read(); data.events.push(...events); write(data); },
  listEvents(): ActivityEvent[] { return read().events; },
  eventsForContact(contactId: string): ActivityEvent[] { return read().events.filter((e) => e.contactId === contactId); },
  eventsForCampaign(campaignId: string): ActivityEvent[] { return read().events.filter((e) => e.campaignId === campaignId); },
  updateContact(contact: Contact) { const data = read(); const i = data.contacts.findIndex((c) => c.id === contact.id); if (i >= 0) { data.contacts[i] = contact; write(data); } },
  bulkUpdateContacts(contacts: Contact[]) { if (contacts.length === 0) return; const data = read(); const byId = new Map(contacts.map((c) => [c.id, c])); data.contacts = data.contacts.map((c) => byId.get(c.id) || c); write(data); },
  reset() { write(structuredClone(EMPTY)); },
};
