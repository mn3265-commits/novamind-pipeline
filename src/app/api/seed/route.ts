import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db/store";
import { reclassifyContact } from "@/lib/classifiers";
import { backfillHistoricalEvents } from "@/lib/analytics/performance-simulator";
import { hubspot } from "@/lib/crm/hubspot-mock";
import { Contact, AcquisitionSource } from "@/lib/types";

const SEEDS = [
  { firstName: "Maya", lastName: "Alvarez", company: "North Signal Studio", jobTitle: "Founder", yearsInRole: 2, acquisitionSource: "blog_organic" as AcquisitionSource, subscribedDaysAgo: 45 },
  { firstName: "Priya", lastName: "Raman", company: "Field Notes Creative", jobTitle: "Founder & CEO", yearsInRole: 6, acquisitionSource: "event" as AcquisitionSource, subscribedDaysAgo: 160 },
  { firstName: "Daniel", lastName: "Weiss", company: "Halcyon Studio", jobTitle: "Managing Partner", yearsInRole: 12, acquisitionSource: "event" as AcquisitionSource, subscribedDaysAgo: 280 },
  { firstName: "Devon", lastName: "Price", company: "North Signal Studio", jobTitle: "Creative Director", yearsInRole: 6, acquisitionSource: "referral" as AcquisitionSource, subscribedDaysAgo: 110 },
  { firstName: "Omar", lastName: "Diallo", company: "Halcyon Studio", jobTitle: "Executive Creative Director", yearsInRole: 11, acquisitionSource: "event" as AcquisitionSource, subscribedDaysAgo: 250 },
  { firstName: "Aiko", lastName: "Tanaka", company: "Field Notes Creative", jobTitle: "Design Director", yearsInRole: 5, acquisitionSource: "blog_organic" as AcquisitionSource, subscribedDaysAgo: 130 },
  { firstName: "Sam", lastName: "Rhodes", company: "North Signal Studio", jobTitle: "Design Intern", yearsInRole: 0, acquisitionSource: "blog_organic" as AcquisitionSource, subscribedDaysAgo: 12 },
  { firstName: "Mei", lastName: "Lin", company: "Field Notes Creative", jobTitle: "Junior Designer", yearsInRole: 1, acquisitionSource: "linkedin" as AcquisitionSource, subscribedDaysAgo: 28 },
  { firstName: "Zoe", lastName: "Park", company: "Outpost Brand Co", jobTitle: "Junior Copywriter", yearsInRole: 1, acquisitionSource: "blog_organic" as AcquisitionSource, subscribedDaysAgo: 22 },
  { firstName: "Leo", lastName: "Fischer", company: "Long Lens Agency", jobTitle: "Junior Motion Designer", yearsInRole: 2, acquisitionSource: "linkedin" as AcquisitionSource, subscribedDaysAgo: 35 },
];

function slugCompany(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export async function POST() {
  try {
    db.reset();
    for (const s of SEEDS) {
      const raw: Contact = {
        id: `contact_${randomUUID().slice(0, 8)}`,
        email: `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}@${slugCompany(s.company)}.example`,
        firstName: s.firstName,
        lastName: s.lastName,
        company: s.company,
        jobTitle: s.jobTitle,
        yearsInRole: s.yearsInRole,
        acquisitionSource: s.acquisitionSource,
        subscribedAt: daysAgo(s.subscribedDaysAgo),
        personaId: "junior_creative",
        seniorityTier: "emerging",
        lifecycleStage: "onboarding",
        rfmScore: "dormant",
        hubspotLifecycleStage: "subscriber",
      };
      const classified = reclassifyContact(raw, []);
      classified.hubspotLifecycleStage = classified.personaId === "agency_founder" ? "mql" : classified.personaId === "creative_director" ? "lead" : "subscriber";
      await hubspot.createOrUpdateContact(classified);
    }
    const contacts = db.listContacts();
    const events = backfillHistoricalEvents(contacts);
    db.saveEvents(events);
    const allEvents = db.listEvents();
    const reclassified = contacts.map((c) => reclassifyContact(c, allEvents));
    db.bulkUpdateContacts(reclassified);
    return NextResponse.json({ ok: true, count: db.listContacts().length });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
