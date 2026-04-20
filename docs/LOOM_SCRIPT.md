# Loom Script — NovaMind Pipeline Walkthrough

**Target length:** 4 to 5 minutes.
**Tone:** senior, practical, zero filler. Talk like you are walking a teammate through a review, not pitching.
**Setup before recording:** run `npm run seed`, then `npm run dev`, open `http://localhost:3000` in one tab and your code editor with `src/lib/pipeline.ts` open in the other.

---

## 0:00 to 0:30 — Frame what you built

> Hi Auston, thanks again for the take-home. I am Agung.
>
> I built an AI content pipeline for NovaMind that does three things the brief asked for: generate content, distribute through a mock HubSpot CRM, and analyze performance. Then I added the part that most take-homes skip: a feedback loop. Every time the pipeline runs, every contact gets re-classified on lifecycle stage and RFM score. Next run, routing is different because the data has changed.
>
> I will walk through the segmentation model, show one live run, then open the code.

---

## 0:30 to 1:30 — Segmentation model

**[Scroll to personas + segment snapshot]**

> Every contact carries four routing dimensions, not one. Persona is what they do. Seniority tier is how senior they are in that role. Lifecycle stage is where they are in their journey with NovaMind. RFM score is how engaged they are right now.
>
> I kept these orthogonal on purpose. If I merged persona and seniority into one flat list, I would get nine buckets that look tidier but lose the cross-cut patterns that matter. When the insight engine tells me "Veteran tier clicks less across every persona," that finding is only possible because tier is a separate dimension.
>
> Persona and seniority come from the job title at subscribe. Lifecycle and RFM are computed from the full event history and re-computed after every run. That is the feedback loop in one sentence.

**[Click through to show the SegmentSnapshot bars]**

> Right now I have 30 seeded contacts. You can see 6 in Onboarding, 15 in Retention, 4 in Loyalty, 5 in Churned. Every lifecycle bucket populated, which is what makes the analysis meaningful. If everyone was in Retention, the dashboard would be a vanity chart.

---

## 1:30 to 2:30 — Live pipeline run

> Let me run the pipeline. Topic: "How a 10-person studio reclaims 20 hours a week."

**[Type the topic, click Run pipeline. While it runs, keep talking.]**

> Under the hood, five things happen. First, Claude generates the blog and three persona newsletters. Second, for each newsletter, Claude generates three first lines, one per seniority tier. That is nine openings from three LLM calls. The tier swap happens at send time, per contact, so I do not pay LLM cost nine times.
>
> Third, the pipeline filters out Churned contacts before sending, and generates one event per remaining contact per campaign. Fourth, every contact gets re-classified based on the updated event history. Fifth, Claude writes the insight report.

**[When run completes, scroll to content preview]**

> Here is the blog, 480 words with a clean outline. And here are the three newsletters. Each one has a "first line by seniority tier" panel. Look at the Founder newsletter — the Emerging Founder opens with "two or three years into running your agency, the math stops working on spreadsheets." The Veteran Founder opens with "after a decade running an agency you have watched three or four tool waves wash through." Same body. Same CTA. Three openings for three moments in a founder's career.

---

## 2:30 to 3:30 — Performance + cross-dim insights

**[Scroll to metrics chart and insight card]**

> The metrics chart shows per-persona performance. What matters more is the section below: cross-dimensional findings. These cut across persona.
>
> The engine is telling me things like "Loyalty cohort converts 3x better than Onboarding" and "RFM Champions click 2.5x more than At-Risk, so win-back campaigns should prioritize At-Risk before they slip to Dormant."
>
> That second one is a directly actionable growth-analyst recommendation. Not "improve engagement." Specific, priority-ordered, with a reason. That is what I would hand a content team on Monday morning.

---

## 3:30 to 4:30 — HubSpot log + feedback loop in code

**[Scroll to HubSpot API log]**

> Every mock HubSpot call is logged with its real v3 endpoint shape and payload. Contact creation carries all the custom properties: persona, seniority_tier, novamind_lifecycle_stage, rfm_score, acquisition_source. Email creation, segment send, send receipt. If you wanted to swap in the real HubSpot SDK tomorrow, you replace one file and nothing else changes.

**[Cut to code editor, open `src/lib/pipeline.ts`]**

> The pipeline is one function. Generate content. Distribute each newsletter, gated by lifecycle stage. Simulate per-contact events. Reclassify every contact from the updated events. Generate insights. Save a run with a segment snapshot.
>
> That reclassifyAllContacts step is the feedback loop. Run this pipeline next week and contacts who clicked today will be RFM Champions, contacts who went quiet will slip toward At-Risk. The next run's routing reads those new labels and makes different decisions. Nothing about this is one-shot.

---

## 4:30 to 5:00 — Wrap

> Three things I would build next. Win-back sequences for Churned and At-Risk contacts, which today just get skipped. A/B testing on subject lines with winner auto-selection. And an auto-scheduled weekly cron that picks the top "next topic" suggestion from the last insight report and runs the pipeline automatically.
>
> The repo has a full README with the architecture, the four-dimensional segmentation rationale, and run instructions. Clone it and run in two commands, no API key needed because the mock fallback is high quality.
>
> Thanks for the opportunity, Auston. Happy to dig into any of this or talk about what I would change on a second pass.

---

## Recording tips

- Record in 1080p, full browser window, hide bookmarks bar.
- Close unrelated tabs. Turn off Slack notifications.
- First take will be bad. Do two, keep the second.
- Do not edit heavily. A little rough is fine; over-edited looks worse at this length.
- Trim dead air at start and end. Upload to Loom. Grab the share link.
- Paste the Loom link into the README at the top, then commit and push.

## What to send back to Auston

A single reply email with:

1. GitHub repo link.
2. Live Vercel URL.
3. Loom link.
4. Two or three sentences on approach. The README covers the rest.

### Suggested email reply

> Hi Auston,
>
> Wrapped up the take-home. Everything is linked below.
>
> - Repo: <github url>
> - Live demo: <vercel url>
> - Loom walkthrough: <loom url>
>
> A few quick notes on approach. I built it in Next.js with a single orchestrator function so the dashboard, CLI, and any future cron share the same code path. The segmentation is four orthogonal dimensions (persona, seniority tier, lifecycle stage, RFM score) because merging them into a single flat list would hide the cross-cut patterns that matter most for a growth analyst. Every pipeline run reclassifies contacts based on updated event history, which gives the system a real feedback loop rather than one-shot output. HubSpot is mocked to the real v3 REST shape so swapping in the SDK is a one-file change. The mock fallback is high quality by design so the project runs without any API key.
>
> Happy to walk through any part of it or talk about what I would change on a second pass.
>
> Thanks,
> Agung
