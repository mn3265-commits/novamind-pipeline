import { randomUUID } from "crypto";
import { AcquisitionSource, Contact } from "../src/lib/types";
import { hubspot } from "../src/lib/crm/hubspot-mock";
import { db } from "../src/lib/db/store";
import { reclassifyContact } from "../src/lib/classifiers";
import { backfillHistoricalEvents } from "../src/lib/analytics/performance-simulator";

// 30 realistic mock contacts.
// Each has:
//   - A realistic job title (the messy real-world string, not a clean label)
//   - yearsInRole (drives seniority tier alongside title keywords)
//   - acquisitionSource (for later cohort analysis)
//   - A subscribedAt date that gives a mix of lifecycle stages
//
// personaId, seniorityTier, lifecycleStage, and rfmScore are NOT set here.
// They are derived by reclassifyContact() so the seed mirrors the same
// flow a real contact form submission would go through in production.

interface ContactSeed {
  firstName: string;
  lastName: string;
  company: string;
  jobTitle: string;
  yearsInRole: number;
  acquisitionSource: AcquisitionSource;
  subscribedDaysAgo: number;
}

// Designed for diversity across all three dimensions:
//   3 personas x 3 seniority tiers x mix of lifecycle stages
// so the insight engine has real patterns to analyze.

const SEEDS: ContactSeed[] = [
  // === Agency founders ===
  // Emerging (new founders, 1-3 years in)
  { firstName: "Maya", lastName: "Alvarez", company: "North Signal Studio", jobTitle: "Founder", yearsInRole: 2, acquisitionSource: "blog_organic", subscribedDaysAgo: 45 },
  { firstName: "Connor", lastName: "Murphy", company: "Slate & Stone", jobTitle: "Co-Founder", yearsInRole: 1, acquisitionSource: "linkedin", subscribedDaysAgo: 18 },
  { firstName: "Jordan", lastName: "Bailey", company: "Cardinal Works", jobTitle: "Founder & CEO", yearsInRole: 3, acquisitionSource: "referral", subscribedDaysAgo: 220 },

  // Established founders (4-8 years)
  { firstName: "Priya", lastName: "Raman", company: "Field Notes Creative", jobTitle: "Founder & CEO", yearsInRole: 6, acquisitionSource: "event", subscribedDaysAgo: 160 },
  { firstName: "Marcus", lastName: "Okafor", company: "Kin & Craft", jobTitle: "Principal", yearsInRole: 5, acquisitionSource: "blog_organic", subscribedDaysAgo: 95 },
  { firstName: "Elena", lastName: "Chen", company: "Outpost Brand Co", jobTitle: "Founder", yearsInRole: 7, acquisitionSource: "linkedin", subscribedDaysAgo: 140 },
  { firstName: "Ravi", lastName: "Patel", company: "Paper & Pixel", jobTitle: "CEO", yearsInRole: 8, acquisitionSource: "referral", subscribedDaysAgo: 200 },

  // Veteran founders (9+ years or veteran-signal titles)
  { firstName: "Daniel", lastName: "Weiss", company: "Halcyon Studio", jobTitle: "Managing Partner", yearsInRole: 12, acquisitionSource: "event", subscribedDaysAgo: 280 },
  { firstName: "Sofia", lastName: "Moreau", company: "Long Lens Agency", jobTitle: "Founder & Creative Director", yearsInRole: 15, acquisitionSource: "referral", subscribedDaysAgo: 340 },
  { firstName: "Amira", lastName: "Haddad", company: "Bright Lab", jobTitle: "Managing Director", yearsInRole: 10, acquisitionSource: "linkedin", subscribedDaysAgo: 75 },

  // === Creative directors ===
  // Emerging (associate CD / senior designer promoted recently)
  { firstName: "Nora", lastName: "Lindqvist", company: "Slate & Stone", jobTitle: "Associate Creative Director", yearsInRole: 2, acquisitionSource: "blog_organic", subscribedDaysAgo: 25 },
  { firstName: "Theo", lastName: "Nakamura", company: "Paper & Pixel", jobTitle: "Associate Creative Director", yearsInRole: 3, acquisitionSource: "linkedin", subscribedDaysAgo: 60 },
  { firstName: "Claire", lastName: "Dubois", company: "Long Lens Agency", jobTitle: "Senior Designer", yearsInRole: 2, acquisitionSource: "event", subscribedDaysAgo: 40 },

  // Established CDs (4-8 years)
  { firstName: "Devon", lastName: "Price", company: "North Signal Studio", jobTitle: "Creative Director", yearsInRole: 6, acquisitionSource: "referral", subscribedDaysAgo: 110 },
  { firstName: "Aiko", lastName: "Tanaka", company: "Field Notes Creative", jobTitle: "Design Director", yearsInRole: 5, acquisitionSource: "blog_organic", subscribedDaysAgo: 130 },
  { firstName: "Lucas", lastName: "Rivera", company: "Kin & Craft", jobTitle: "Creative Director", yearsInRole: 7, acquisitionSource: "linkedin", subscribedDaysAgo: 170 },
  { firstName: "Hannah", lastName: "Berg", company: "Outpost Brand Co", jobTitle: "Art Director", yearsInRole: 4, acquisitionSource: "paid_ad", subscribedDaysAgo: 85 },

  // Veteran CDs
  { firstName: "Omar", lastName: "Diallo", company: "Halcyon Studio", jobTitle: "Executive Creative Director", yearsInRole: 11, acquisitionSource: "event", subscribedDaysAgo: 250 },
  { firstName: "Isabel", lastName: "Santos", company: "Cardinal Works", jobTitle: "Head of Creative", yearsInRole: 9, acquisitionSource: "referral", subscribedDaysAgo: 195 },
  { firstName: "Jamal", lastName: "Brooks", company: "Bright Lab", jobTitle: "Chief Creative Officer", yearsInRole: 13, acquisitionSource: "linkedin", subscribedDaysAgo: 210 },

  // === Junior creatives ===
  // Emerging (interns, juniors - most juniors sit here)
  { firstName: "Sam", lastName: "Rhodes", company: "North Signal Studio", jobTitle: "Design Intern", yearsInRole: 0, acquisitionSource: "blog_organic", subscribedDaysAgo: 12 },
  { firstName: "Mei", lastName: "Lin", company: "Field Notes Creative", jobTitle: "Junior Designer", yearsInRole: 1, acquisitionSource: "linkedin", subscribedDaysAgo: 28 },
  { firstName: "Diego", lastName: "Ortega", company: "Kin & Craft", jobTitle: "Associate Designer", yearsInRole: 2, acquisitionSource: "paid_ad", subscribedDaysAgo: 50 },
  { firstName: "Zoe", lastName: "Park", company: "Outpost Brand Co", jobTitle: "Junior Copywriter", yearsInRole: 1, acquisitionSource: "blog_organic", subscribedDaysAgo: 22 },
  { firstName: "Asha", lastName: "Mensah", company: "Halcyon Studio", jobTitle: "Design Intern", yearsInRole: 0, acquisitionSource: "event", subscribedDaysAgo: 8 },
  { firstName: "Leo", lastName: "Fischer", company: "Long Lens Agency", jobTitle: "Junior Motion Designer", yearsInRole: 2, acquisitionSource: "linkedin", subscribedDaysAgo: 35 },

  // Established (3-4 years, mid-level designer)
  { firstName: "Nia", lastName: "Johnson", company: "Paper & Pixel", jobTitle: "Designer", yearsInRole: 4, acquisitionSource: "referral", subscribedDaysAgo: 100 },
  { firstName: "Rafael", lastName: "Costa", company: "Cardinal Works", jobTitle: "Mid-level Designer", yearsInRole: 5, acquisitionSource: "blog_organic", subscribedDaysAgo: 150 },
  { firstName: "Hana", lastName: "Kim", company: "Bright Lab", jobTitle: "Motion Designer", yearsInRole: 4, acquisitionSource: "linkedin", subscribedDaysAgo: 90 },

  // Veteran IC (rare but exists - senior specialist who stayed IC)
  { firstName: "Tobias", lastName: "Becker", company: "Slate & Stone", jobTitle: "Senior Production Artist", yearsInRole: 10, acquisitionSource: "event", subscribedDaysAgo: 240 },
];

async function seed() {
  console.log("Resetting data store...");
  db.reset();

  console.log(`Creating ${SEEDS.length} mock contacts in HubSpot...`);
  let created = 0;
  for (const s of SEEDS) {
    // Build a raw contact with placeholder derived fields. reclassifyContact
    // will overwrite them based on the real classifiers.
    const rawContact: Contact = {
      id: `contact_${randomUUID().slice(0, 8)}`,
      email: `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}@${slugCompany(s.company)}.example`,
      firstName: s.firstName,
      lastName: s.lastName,
      company: s.company,
      jobTitle: s.jobTitle,
      yearsInRole: s.yearsInRole,
      acquisitionSource: s.acquisitionSource,
      subscribedAt: daysAgo(s.subscribedDaysAgo),
      // Placeholders - will be overwritten
      personaId: "junior_creative",
      seniorityTier: "emerging",
      lifecycleStage: "onboarding",
      rfmScore: "dormant",
      hubspotLifecycleStage: "subscriber",
    };

    // Run through classifiers (no events yet, so lifecycle=onboarding or churned
    // depending on tenure, rfm=dormant for all — correct initial state).
    const classified = reclassifyContact(rawContact, []);

    // Set HubSpot lifecycle based on persona (rough mapping for demo)
    classified.hubspotLifecycleStage =
      classified.personaId === "agency_founder"
        ? "mql"
        : classified.personaId === "creative_director"
          ? "lead"
          : "subscriber";

    await hubspot.createOrUpdateContact(classified);
    created++;
  }

  console.log(`Done. ${created} contacts created.\n`);

  // Backfill synthetic historical engagement so the first pipeline run
  // has meaningful lifecycle and RFM states to work with.
  console.log("Backfilling synthetic engagement history...");
  const contacts = db.listContacts();
  const historicalEvents = backfillHistoricalEvents(contacts);
  db.saveEvents(historicalEvents);
  console.log(`  Generated ${historicalEvents.length} historical events across contacts.\n`);

  // Reclassify contacts now that they have event history
  console.log("Reclassifying contacts based on event history...");
  const allEvents = db.listEvents();
  const reclassified = contacts.map((c) => reclassifyContact(c, allEvents));
  db.bulkUpdateContacts(reclassified);
  console.log("  Done.\n");

  const finalContacts = db.listContacts();

  console.log("Persona distribution:");
  for (const p of ["agency_founder", "creative_director", "junior_creative"] as const) {
    console.log(`  ${p}: ${finalContacts.filter((c) => c.personaId === p).length}`);
  }

  console.log("\nSeniority tier distribution:");
  for (const t of ["emerging", "established", "veteran"] as const) {
    console.log(`  ${t}: ${finalContacts.filter((c) => c.seniorityTier === t).length}`);
  }

  console.log("\nLifecycle stage distribution (post-backfill):");
  for (const l of ["onboarding", "retention", "loyalty", "churned"] as const) {
    console.log(`  ${l}: ${finalContacts.filter((c) => c.lifecycleStage === l).length}`);
  }

  console.log("\nRFM score distribution:");
  for (const r of ["champion", "engaged", "at_risk", "dormant"] as const) {
    console.log(`  ${r}: ${finalContacts.filter((c) => c.rfmScore === r).length}`);
  }

  console.log("\nAcquisition source distribution:");
  for (const a of ["blog_organic", "linkedin", "referral", "event", "paid_ad"] as const) {
    console.log(`  ${a}: ${finalContacts.filter((c) => c.acquisitionSource === a).length}`);
  }
}

function slugCompany(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
