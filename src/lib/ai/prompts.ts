import { Persona } from "../types";

export function blogPrompt(topic: string) {
  return `You are the Head of Content at NovaMind, an early-stage AI startup that helps small creative agencies automate their daily workflows. Think Notion plus Zapier plus ChatGPT, purpose-built for 5 to 30 person agencies.

Your weekly blog audience is agency owners, creative directors, and junior creatives. Tone: practical, senior, a little opinionated. Never hype. Never "In today's fast-paced world." Never em dashes.

Write a blog post on this topic:
"${topic}"

Return JSON only, with this exact shape:
{
  "title": "string, under 70 characters, specific and concrete",
  "outline": ["bullet 1", "bullet 2", "bullet 3", "bullet 4", "bullet 5"],
  "body": "string, 400 to 600 words, markdown allowed, no H1 (title lives outside), use H2 for section headers that mirror the outline"
}

Rules for the body:
- Lead with a concrete scene or number, not a definition.
- At least one specific example involving an agency workflow (client handoffs, revisions, traffic management, creative briefs, etc).
- End with a pragmatic takeaway or a small action the reader can try this week.
- Do not mention NovaMind by name more than once. Do not pitch.`;
}

export function newsletterPrompt(
  persona: Persona,
  blogTitle: string,
  blogBody: string
) {
  return `You are writing a short newsletter email for NovaMind that promotes this week's blog post.

Blog title: "${blogTitle}"
Blog body:
---
${blogBody}
---

You are writing ONLY for this persona. Everything about the email must feel made for them and no one else:

Name: ${persona.name}
Role: ${persona.role}
Pains: ${persona.pains.join("; ")}
Motivations: ${persona.motivations.join("; ")}
Copy angle: ${persona.copyAngle}
Preferred CTA: ${persona.preferredCTA}
Tone: ${persona.tone}

Return JSON only, this exact shape:
{
  "subject": "string, under 60 characters, no emoji, no clickbait",
  "preheader": "string, under 90 characters, continues the subject's thought",
  "body": "string, 120 to 180 words, plain text with line breaks, no markdown, no salutation that says 'Dear', open with something that hooks THIS persona in the first line",
  "cta": { "label": "short action phrase, under 5 words", "href": "/blog/${slugify(blogTitle)}" }
}

Rules:
- The first sentence must reflect this persona's specific world. A founder email should not open like a junior email.
- No em dashes. Use periods or commas.
- No "In today's landscape." No "Imagine a world where."
- End with the CTA label as the final line of body, then the JSON cta field.`;
}

export function insightPrompt(
  topic: string,
  metricsSummary: string
) {
  return `You are the Content and Growth Analyst at NovaMind. You just ran a campaign on the topic "${topic}" with three persona-targeted newsletter variants.

Here is the performance data:
${metricsSummary}

Return JSON only, this exact shape:
{
  "summary": "string, 2 to 3 sentences, lead with the most useful finding",
  "winners": ["short bullet 1", "short bullet 2"],
  "opportunities": ["short bullet 1", "short bullet 2"],
  "nextTopicSuggestions": ["topic 1", "topic 2", "topic 3"]
}

Rules:
- Be specific with numbers. "Junior segment click rate was 2.1x the founder segment" is good.
- Opportunities should be actionable. "Test a visual case study in the founder newsletter next run" is good. "Improve engagement" is not.
- Next topics should fit NovaMind's niche (AI plus agency workflows) and build on what worked.
- No em dashes.`;
}

export function firstLineByTierPrompt(
  persona: Persona,
  blogTitle: string,
  newsletterBody: string
) {
  return `You wrote this newsletter email for NovaMind:

Blog title: "${blogTitle}"
Persona: ${persona.name} (${persona.role})
Current newsletter body:
---
${newsletterBody}
---

Now rewrite ONLY the first sentence in three versions, one for each seniority tier of this persona. Everything else about the email stays the same.

Tier mindsets to hit:
- emerging (0-3 years): Acknowledge they are still building. Speak to the moment of figuring things out. Offer something concrete.
- established (3-8 years): Peer-to-peer. Lead with a specific outcome or number. No hand-holding.
- veteran (8+ years): Respect their experience. Signal you have seen what they have seen. Skip the tutorial energy.

Return JSON only, this exact shape:
{
  "emerging": "one sentence, starts with a natural hook for this tier",
  "established": "one sentence",
  "veteran": "one sentence"
}

Rules:
- Each sentence under 30 words.
- The first word can be the persona's first name ("${persona.name.split(" ")[0]}") or a direct hook.
- No em dashes. No "In today's landscape". No "Imagine".
- Three sentences must feel clearly different from each other. If two feel interchangeable, rewrite.`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
