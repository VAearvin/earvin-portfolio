# Audit Delivery Playbook (Claude-assisted)

Internal tool. Not deployed, not linked anywhere public. This is how you turn a
paid $57 audit lead into a delivered report in ~30–45 minutes instead of hours,
with Claude doing the heavy lifting and you doing the judgment.

> The rule: Claude drafts, you decide. Never send an audit you have not read top
> to bottom. These audits are the audition for your $1,800–$9,997 builds.

---

## The workflow, per lead

1. **Get the lead** from Airtable (Leads table). You need: `Website`/`url`,
   `Name`, and their `Notes` (their stated concern). Source tells you which kind:
   `website-audit-57` → use the WEBSITE block. `funnel-audit-57` → use the FUNNEL block.
2. **Gather inputs** (5 min):
   - The live URL (Claude fetches it).
   - 1–3 screenshots: hero/top of page, the main CTA area, and mobile if you can.
     (Claude reads HTML well but cannot *see* rendered design, so screenshots fix that.)
   - Optional but strong: a PageSpeed score. Run the URL through
     pagespeed.web.dev and paste the mobile + desktop numbers.
3. **Run the prompt** below in Claude (Claude Code or claude.ai). Paste the URL,
   the screenshots, the PageSpeed numbers, and their stated concern.
4. **Review and sharpen** (10–15 min): fix anything Claude got wrong, add the
   design-eye judgment, make sure the top 3 fixes are genuinely the top 3.
5. **Render** into the branded report template → export PDF.
6. **Send + book** the 30-min walkthrough call.

---

## The master prompt

Copy everything in the block, fill the [BRACKETS], paste into Claude with the
screenshots attached.

```
You are helping me, Earvin Laureano, produce a paid, comprehensive [WEBSITE|FUNNEL]
audit for a client. The deliverable is a written report with a prioritized,
actionable fix plan. It is priced at $57 but positioned as a $597 deep review, so
it must be genuinely thorough, specific, and useful, never generic.

VOICE: dry, confident, lightly pointed. Plain language. You/your, addressed to the
client. NO em dashes anywhere (use periods, commas, or restructure). No hype, no
filler, no "in today's digital landscape." Every finding names a real thing on
THEIR page, not a generic best practice.

CLIENT CONTEXT
- URL: [URL]
- Their stated concern: [PASTE THEIR NOTES, or "none given"]
- PageSpeed (if provided): mobile [NN], desktop [NN]
- Screenshots: attached (treat these as ground truth for visual/design judgments)

YOUR TASK
Fetch and read the page(s). Then produce the audit in EXACTLY this structure:

1. SNAPSHOT (3–4 sentences)
   The honest headline: what is working, what is quietly costing them, and the
   single biggest opportunity. No scores theater. Just the truth.

2. SCORES (one line each, with a one-sentence "why")
   Rate each area Good / Needs work / Poor:
   [WEBSITE: Performance · SEO & structure · AI-search readiness · Design & credibility · Conversion path · Content]
   [FUNNEL:  Offer clarity · Hook & first screen · Page flow & sequence · Copy & messaging · CTAs & friction · Trust & proof · Mobile · Speed]

3. WHAT IS WORKING (3–5 bullets)
   Be specific and genuine. Earn the right to criticize by seeing what is good.

4. WHAT IS COSTING YOU (the core)
   The real problems, each as: what it is, where (be specific, name the section),
   why it costs them money/leads, and roughly how much it matters.

5. THE FIX PLAN (up to 20 items, PRIORITIZED)
   A numbered list, hardest-hitting first. Each fix = one line of WHAT to do +
   one line of WHY it works + (if useful) HOW in plain terms. A non-technical
   owner OR their developer should be able to act on each one. Mark the top 3 as
   "Do these first."

6. THE ONE THING (1 short paragraph)
   If they only do one thing this month, what and why.

RULES
- Be concrete. "Your headline does not say what you sell" beats "improve messaging."
- If you cannot verify something (e.g. real analytics, live AI-search ranking),
  say so plainly rather than guessing.
- Do not pad to hit 20 fixes. 9 sharp fixes beats 20 soft ones.
- Match the client's actual industry and what their page is trying to do.
```

---

## Website-audit emphasis

When auditing a WEBSITE, weight the report toward: does it look credible to the
right buyer, does it load fast, is it found in Google AND AI search (clean schema,
semantic HTML, answerable content), and does it actually turn a visitor into a
booked/paying lead. The free 60-second scan on /audit gives you PageSpeed + SEO
basics + AI-readiness to seed section 2.

## Funnel-audit emphasis

When auditing a FUNNEL, weight toward the PATH, not one page: offer clarity in
five seconds, whether the first screen earns the scroll, every step from entry to
conversion in order, where people drop off and why, one clear CTA per section vs a
fork, form friction (every extra field), trust before the ask, and the mobile
experience. Map the funnel as a sequence and find the leak, not just the ugly bit.

---

## Quality bar before you send

- [ ] Did I read every line? Would I stand behind it on the call?
- [ ] Are the top 3 fixes genuinely the highest-leverage ones?
- [ ] Is every finding specific to THIS site, not a generic checklist?
- [ ] Zero em dashes, zero hype, zero filler.
- [ ] Does it make them think "if the free-ish audit is this good, I want the build"?

---

## Speed targets

- Inputs gathered: 5 min
- Claude draft: 2–3 min
- Your review + sharpen: 10–15 min
- Render to PDF + send: 5 min
- Total: ~30 min. Promise 3 business days, deliver in 1. Underpromise, overdeliver.
