import { randomUUID } from "crypto";
import { PERSONAS } from "../personas";
import {
  BlogPost,
  ContentPackage,
  NewsletterVariant,
  PersonaId,
  SeniorityTier,
} from "../types";
import { completeJSON, hasLiveAI } from "./client";
import { blogPrompt, newsletterPrompt, firstLineByTierPrompt, slugify } from "./prompts";

interface BlogResponse {
  title: string;
  outline: string[];
  body: string;
}

interface NewsletterResponse {
  subject: string;
  preheader: string;
  body: string;
  cta: { label: string; href: string };
}

interface FirstLineResponse {
  emerging: string;
  established: string;
  veteran: string;
}

export async function generateContentPackage(topic: string): Promise<ContentPackage> {
  const live = hasLiveAI();
  const blog = live ? await generateBlogLive(topic) : generateBlogMock(topic);
  const newsletters: NewsletterVariant[] = [];

  for (const persona of PERSONAS) {
    let variant = live
      ? await generateNewsletterLive(persona.id, blog.title, blog.body)
      : generateNewsletterMock(persona.id, blog.title);

    // Generate first-line variants per seniority tier
    variant.firstLineByTier = live
      ? await generateFirstLinesLive(persona.id, blog.title, variant.body)
      : generateFirstLinesMock(persona.id);

    newsletters.push(variant);
  }

  return {
    id: randomUUID(),
    topic,
    blog,
    newsletters,
    generatedBy: live ? "claude" : "mock",
    createdAt: new Date().toISOString(),
  };
}

async function generateBlogLive(topic: string): Promise<BlogPost> {
  const resp = await completeJSON<BlogResponse>(blogPrompt(topic), 2000);
  return {
    id: randomUUID(),
    topic,
    title: resp.title,
    outline: resp.outline,
    body: resp.body,
    wordCount: countWords(resp.body),
    createdAt: new Date().toISOString(),
  };
}

async function generateNewsletterLive(
  personaId: PersonaId,
  blogTitle: string,
  blogBody: string
): Promise<NewsletterVariant> {
  const persona = PERSONAS.find((p) => p.id === personaId)!;
  const resp = await completeJSON<NewsletterResponse>(
    newsletterPrompt(persona, blogTitle, blogBody),
    1200
  );
  return {
    personaId,
    subject: resp.subject,
    preheader: resp.preheader,
    body: resp.body,
    cta: resp.cta,
  };
}

async function generateFirstLinesLive(
  personaId: PersonaId,
  blogTitle: string,
  newsletterBody: string
): Promise<Record<SeniorityTier, string>> {
  const persona = PERSONAS.find((p) => p.id === personaId)!;
  const resp = await completeJSON<FirstLineResponse>(
    firstLineByTierPrompt(persona, blogTitle, newsletterBody),
    600
  );
  return {
    emerging: resp.emerging,
    established: resp.established,
    veteran: resp.veteran,
  };
}

// ---------- Mock generators (used when ANTHROPIC_API_KEY is absent) ----------

function generateBlogMock(topic: string): BlogPost {
  const title = `The quiet way ${topic.toLowerCase()} is reshaping small agencies`;
  const outline = [
    "Why most agencies still run on manual glue work",
    "Where AI actually earns its keep in an agency week",
    "A case study from a 14-person studio",
    "Three workflows to pilot this month",
    "What to measure before you expand",
  ];
  const body = `## Why most agencies still run on manual glue work

Walk into any 12-person agency on a Monday morning and you will find the same pattern. Senior creatives are answering Slack pings instead of designing. Project managers are copying the same status update into three different tools. Juniors are hunting for the right brand assets in a Google Drive that was last cleaned up in 2021. Somebody is rewriting the same client recap email they wrote last Thursday.

This is the tax that quietly kills margins at small shops. It is not the client work itself. It is the work around the work. The seams between the tools and the people.

## Where AI actually earns its keep

The flashy demos are not where the value lives. A fully AI-written campaign rarely ships, and when it does, it rarely lands. The value lives in the boring seams. Drafting the internal brief from the client call transcript. Turning a rambling Slack thread into a clean changelog the account lead can forward. Generating three subject line options for the newsletter the junior has to ship by Friday at noon.

Each of these saves 15 to 40 minutes. Across a week and a team of a dozen people, that compounds into full days.

## A case study from a 14-person studio

One branding studio we spoke with runs a weekly ritual that started as a joke and stuck. Every Friday afternoon the team lists the three most repetitive tasks from the week. Anything that hits the list three weeks in a row goes into the automation backlog. Anything that hits it five weeks in a row gets built before anyone touches new client work.

Six months in, they had reclaimed roughly 22 hours a week, most of it senior time. The senior time did not turn into Netflix. It turned into two new retainers and a pitch they would have otherwise skipped.

## Three workflows to pilot this month

Pick one workflow, not five. Good candidates: client recap emails, weekly social posts repurposed from your blog, and first-pass creative briefs from discovery calls. Run the new AI-assisted version alongside the old version for two weeks and measure the time delta honestly. Resist the urge to ship the AI version just because you built it.

## What to measure

Hours saved per role. Rework rate on AI-assisted output. Client satisfaction on deliverables that touched AI versus ones that did not. If any of those three moves the wrong way, you have not automated the work. You have offloaded it onto your future self.

The agencies that win the next two years will not be the ones that adopt the most tools. They will be the ones that get clear about what only a skilled human should do, and then ruthlessly remove everything else from that human's plate. The tools are commodity. Judgment is not.`;

  return {
    id: randomUUID(),
    topic,
    title,
    outline,
    body,
    wordCount: countWords(body),
    createdAt: new Date().toISOString(),
  };
}

function generateNewsletterMock(
  personaId: PersonaId,
  blogTitle: string
): NewsletterVariant {
  const href = `/blog/${slugify(blogTitle)}`;

  if (personaId === "agency_founder") {
    return {
      personaId,
      subject: "22 hours a week, reclaimed",
      preheader: "How a 14-person studio turned Friday rituals into margin.",
      body: `Maya,\n\nOne studio we tracked for six months pulled 22 hours a week out of senior time without adding a single hire. They did it with a Friday ritual, not a platform migration.\n\nThis week's post breaks down the exact workflow they ran, what they measured, and the three pilots most likely to pay back inside a month.\n\nIf even one of these works for your team, that is roughly one senior FTE of capacity back in the business.\n\nBook a 20-minute demo`,
      cta: { label: "Book a 20-minute demo", href },
    };
  }

  if (personaId === "creative_director") {
    return {
      personaId,
      subject: "Where AI stops being useful",
      preheader: "The line between amplifier and flattener, drawn honestly.",
      body: `Devon,\n\nMost AI-in-creative pieces are either sales decks or doom scrolls. This one tries to be neither.\n\nIt is a field note from an agency that uses AI heavily on the seams around the work, and almost never on the work itself. Client recaps, changelogs, brief drafts. Things juniors used to lose half a day to.\n\nThe craft stays human. The glue stops costing you.\n\nWorth ten minutes if you are tired of hearing that AI will write your next campaign.\n\nRead the founder interview`,
      cta: { label: "Read the founder interview", href },
    };
  }

  return {
    personaId,
    subject: "A shortcut seniors already use",
    preheader: "The Friday habit that makes junior work feel senior.",
    body: `Sam,\n\nHere is a small habit most seniors at good agencies run on autopilot. They spend 15 minutes every Friday listing the three things they did this week that felt like copy-paste.\n\nAnything that shows up three weeks in a row goes into a personal automation list.\n\nOver a few months, that one habit is what turns a junior into the person other juniors ask for help. This week's post has the full version plus a starter template.\n\nGrab the starter template pack`,
    cta: { label: "Grab the starter template pack", href },
  };
}

function generateFirstLinesMock(
  personaId: PersonaId
): Record<SeniorityTier, string> {
  // Mock first-line variants per seniority tier. These mirror what the
  // live LLM would produce but work offline. In a real deployment these
  // would be regenerated per blog from firstLineByTierPrompt.
  if (personaId === "agency_founder") {
    return {
      emerging:
        "Maya, if you are two or three years into running your agency, this is the month where the math stops working on spreadsheets and starts working on systems.",
      established:
        "Maya, one studio we tracked for six months pulled 22 hours a week out of senior time without adding a single hire.",
      veteran:
        "Maya, after a decade running an agency you have probably watched three or four tool waves wash through and leave margins exactly where they were. This one is different on the seams, not the surface.",
    };
  }

  if (personaId === "creative_director") {
    return {
      emerging:
        "Devon, stepping into a CD role means half your week is suddenly about systems you never signed up to manage. This post is for the seams, not the craft.",
      established:
        "Devon, most AI-in-creative pieces are either sales decks or doom scrolls. This one tries to be neither.",
      veteran:
        "Devon, you have survived enough creative software cycles to know when a tool is actually changing the work and when it is just renaming it. Here is a field note from an agency that uses AI only where it belongs.",
    };
  }

  // junior_creative
  return {
    emerging:
      "Sam, if you are in your first year at an agency and everything feels like drinking from a firehose, here is a small habit that will make you look a level more senior by next quarter.",
    established:
      "Sam, here is a small habit most seniors at good agencies run on autopilot, and nobody ever writes it down for juniors.",
    veteran:
      "Sam, if you have been an IC designer for years and watched juniors get promoted past you, the move is not more output. It is visibility on the work nobody else wants to own.",
  };
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
