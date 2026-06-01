# BUILD PLAN — Category Pages ("How You Can Work With Me")

> Planned on Opus. Hand this file to the builder (Sonnet). Build on a **preview
> branch**, keep the site in **maintenance mode** the whole time, preview locally,
> and only merge + turn maintenance off when Earvin approves.

---

## 0. Goal
The single long `/pricing` page is getting cluttered. Replace it with:
1. **A hub page** — "How You Can Work With Me" — short, scannable, with one clickable
   card per service that links to its own dedicated page.
2. **One focused page per service** — each page talks about ONLY that service
   (who it's for, what's included, price, FAQ, CTA). No clutter.

Keep the existing **dark + gold (#C7A97F)** design, Inter font, components, and the
calm/premium **Operations & Web Partner** voice. No guaranteed-outcome claims. No
"manager" or hourly language. AI-search optimized (schema, clean semantic HTML).

---

## 1. The services → pages (clean URLs via existing `cleanUrls`)

| Page | URL | Maps from current tiers |
|------|-----|--------------------------|
| **Hub** ("How You Can Work With Me") | `/pricing` (repurpose this URL) | the old pricing page becomes the hub |
| **Website Audit** | `/audit` (exists — the tool) | Free scan + Full Audit $600 + the Free-vs-Full comparison table (move it here) |
| **New Website** | `/new-website` | Foundation (from $1,800) · Foundation + SEO & AI (from $3,800) |
| **Rebrand** | `/rebrand` | Relaunch (from $2,400) · Relaunch + SEO & AI (from $4,400). *(Brand Refresh add-on deferred — add later.)* |
| **Web Migration** | `/migration` | Managed Migration (starts at $10,000 · custom quote) |
| **Funnel Building** | `/funnel` | Lead-Gen Funnel (from $1,500) |
| **Partnership** | `/partnership` | Operations partnership (from $2,000/mo · scoped) |
| **Website Maintenance** | `/care` | Care $99 · Growth $299 · Pro $599 /mo |

> ⚠️ Use `/care` (not `/maintenance`) for the maintenance-plans page — `/maintenance`
> is currently the offline holding page. (When the site goes live the holding page's
> redirect is removed, but keep the plans page at `/care` to avoid any clash.)

New page files to create: `new-website.html`, `rebrand.html`, `migration.html`,
`funnel.html`, `partnership.html`, `care.html`. Repurpose `pricing.html` as the hub.
Update `audit.html`.

---

## 2. Architecture — DRY this out first (important with 8 pages)

Right now CSS + nav + footer + the pricing config are duplicated inline per page.
With 8 pages that's unmaintainable. **Before building the pages, extract shared assets:**

1. **`assets/site.css`** — the design system (tokens `:root`, nav, buttons, sections,
   reveal, footer, shared card styles). Every page links it: `<link rel="stylesheet" href="/assets/site.css">`.
   Page-specific styles stay in a small inline `<style>` per page.
2. **`assets/pricing.js`** — the single `PRICING` config object (currency, all prices,
   `bookingUrl: "/#contact"`, terms) + small render/format helpers (`money()`, etc.).
   One source of truth across all pages.
3. **`assets/layout.js`** — renders the **shared nav + footer** into placeholder
   elements (`<div id="nav"></div>`, `<div id="footer"></div>`) so nav changes are
   one-file. Include the mobile hamburger logic here.

> Result: each new category page is mostly content, not boilerplate. Reuse the
> existing tier-card / audit-card / compare-table CSS patterns from the current
> pricing page — move them into `site.css`.

Keep the existing reveal-on-scroll IntersectionObserver and nav-scroll behavior in a
shared script too.

---

## 3. The hub page — `/pricing` ("How You Can Work With Me")

Short and scannable. Structure:
- Shared nav.
- Hero: eyebrow "Ways to Work Together", H1 e.g. *"How We Can Work Together"*, one-line
  intro, two quick context lines (one-time projects vs ongoing partnership).
- **Option cards grid** (one card per service). Each card: icon, name, one-line
  "who it's for", a from-price (or "Free" / "from $X/mo" / "custom"), and a button
  → its page. Cards:
  1. Website Audit — "See where you stand." — Free → `/audit`
  2. New Website — "No site yet, or starting fresh." — from $1,800 → `/new-website`
  3. Rebrand — "Rebuild your site and refresh your look." — from $2,400 → `/rebrand`
  4. Web Migration — "Rebuild without losing your rankings." — from $10,000 → `/migration`
  5. Funnel Building — "Turn traffic into booked leads." — from $1,500 → `/funnel`
  6. Partnership — "An ongoing right hand for your operations." — from $2,000/mo → `/partnership`
  7. Website Maintenance — "Keep your site fast, secure & current." — from $99/mo → `/care`
- A short "Not sure where to start? → Take the free audit" nudge.
- Keep the existing **"Which is right for you?" helper** (2 toggles) but have its result
  link to the matching *page* now (e.g. "yes site + ranks" → `/migration`).
- Keep the **AI-search banner** and **FAQ accordion** on the hub (general FAQs).
- Shared footer.
- Per-page schema: `Service` + `FAQPage` JSON-LD (move FAQ JSON-LD generator into shared js).

---

## 4. Category page template (every option page follows this)

Consistent layout so they feel like a family:
1. Shared nav.
2. **Hero**: eyebrow (category), H1, italic "who this is for" line, 1–2 sentence value, primary CTA ("Book a call" → `/#contact`; Audit uses the tool).
3. **Pricing block**: the tier card(s) for this category, rendered from `assets/pricing.js`.
   - Premium / custom-quote tiers (Migration, Partnership) show "starts at / from … · scoped"
     with a **call CTA**, never a buy button.
4. **What's included** — bullets (reuse existing copy from current tiers).
5. **AI-search optimized** note where relevant (builds/funnel/migration).
6. **Mini-FAQ** — 3–5 FAQs relevant to THIS service only (pull the relevant ones from
   the current FAQ set; e.g. Migration page gets the "Relaunch vs Migration" + "rankings"
   FAQs; New Website gets timeline/payment; etc.).
7. **Cross-links**: "← All ways to work together" (→ `/pricing`) and a relevant sibling
   (e.g. Rebrand page links to Migration: "Need to keep your rankings? See Managed Migration").
8. **Bottom CTA** → `/#contact`.
9. Shared footer. Per-page `<title>`, meta description, canonical (`/new-website` etc.),
   OG/Twitter, and `Service` + `FAQPage` JSON-LD.

### Per-page specifics

**Website Audit — `/audit`** (update existing)
- Keep the free audit tool exactly as is (form, results, "what's not covered" gap list).
- **Move the Free-vs-Full comparison table here** (from the current pricing page) so the
  audit page is the full Audit story: run the free scan → see the comparison → book the $600.
- $600 Full Audit CTA → `/#contact`.

**New Website — `/new-website`**
- For: "I don't have a website yet — or I'm starting fresh."
- Cards: Foundation (from $1,800), Foundation + SEO & AI (from $3,800).
- FAQs: timeline, payment (50/50 deposit), CMS/editing, what's AI search optimization.

**Rebrand — `/rebrand`**
- For: "I have a site — rebuild it better."
- Cards: Relaunch (from $2,400), Relaunch + SEO & AI (from $4,400).
- Explicit copy: this is a fresh start and does **not preserve existing rankings** — if you
  rank and can't afford to lose traffic, point to **Managed Migration** (`/migration`).
- FAQs: Relaunch vs Migration, payment, what's AI search optimization.
- 🔜 **Deferred (do NOT build yet):** a "Brand Refresh" add-on (logo / colours / typography /
  visual identity). Earvin will add this later. Leave room for it but don't include it now.

**Web Migration — `/migration`**
- For: "I have a site that ranks and brings in traffic I can't afford to lose."
- Managed Migration — **starts at $10,000 · custom quote**, "Book a call · scoped via the audit"
  CTA (no buy button). Badge: "Premium · protects rankings."
- Sell the **process and care** (URL crawl, 1:1 301 redirects, metadata/schema preservation,
  staged launch, post-launch monitoring, rollback plan) — NOT a guaranteed result.
- FAQs: Relaunch vs Migration, what "scoped via the audit" means, no-guarantee honesty.

**Funnel Building — `/funnel`**
- For: "I want a page that turns traffic into booked leads."
- Lead-Gen Funnel — from $1,500. Opt-in + thank-you + lead capture, AI-search optimized.
- FAQs: what's included, timeline, can it connect to my CRM/sheet.

**Partnership — `/partnership`**
- For: "I want an ongoing right hand to run my operations."
- From **$2,000/mo · scoped to you** — retainer, never hourly. "Book a call" CTA.
- Absorbs: executive & admin, marketing & content, design & creative, CRM, AI & automation.
- (Heavier "Dedicated" ~$3,500/mo exists, quoted on the call — does not need to be published.)
- FAQs: partnership vs a project, what's the scope, how billing works (retainer, no hourly).

**Website Maintenance — `/care`**
- For: "Keep my site fast, secure, and up to date after launch."
- Care $99 · Growth $299 · Pro $599 /mo. Clarify: this is website maintenance, **separate
  from the operations Partnership**.
- FAQs: what each tier covers, first month free, attaches to any build.

---

## 5. Nav, homepage, sitemap, links

- **Nav** (shared): logo → `/`, Services → `/#support`, How I Work → `/#how`,
  Experience → `/#experience`, **Work With Me → `/pricing`** (the hub), Contact → `/#contact`,
  CTA "Get In Touch" → `/#contact`. ✅ DECIDED: nav label is **"Work With Me"** (was "Pricing").
- **Homepage two-track**: "Projects & Builds" card → `/pricing` (hub). "The Partnership"
  card → `/partnership`. Keep the connector line.
- **Sitemap.xml**: add all new pages (`/new-website`, `/rebrand`, `/migration`, `/funnel`,
  `/partnership`, `/care`) with sensible priorities; keep `/`, `/pricing`, `/audit`.
- Update any internal links that pointed at `/pricing#audit` etc. to the right new page.

---

## 6. Guardrails (unchanged)
- Build on a **preview branch** (e.g. `feature/category-pages`); do NOT merge to `main`
  or turn off maintenance until Earvin approves.
- **Keep the site in maintenance mode** during the build (the `/maintenance` redirect in
  `vercel.json` stays). Preview locally with `node dev-server.js` (or `python3 -m http.server`
  for static-only) — and via the Vercel **preview** deployment.
- Match dark+gold design & components exactly; new pages must look native.
- No secrets committed. No guaranteed rankings/AI citations. No "manager"/hourly language.
- All prices from `assets/pricing.js` (one source of truth). Brand Refresh price is a
  PLACEHOLDER until Earvin sets it.

---

## 7. Suggested build order (for Sonnet)
1. Extract `assets/site.css`, `assets/pricing.js`, `assets/layout.js`; refactor `index`,
   `pricing`, `audit` to use them (verify nothing breaks, site still renders identically).
2. Build the hub (`/pricing` repurposed) with the option cards.
3. Build the 6 category pages from the template, content per §4.
4. Move the comparison table to `/audit`.
5. Update nav, homepage links, sitemap, JSON-LD.
6. Local preview + screenshots of every page for Earvin to review.
7. On approval: merge to `main`, remove the maintenance redirect from `vercel.json`
   (turn the site back on), verify all clean URLs return 200.

---

## 8. Decisions (resolved)
- ✅ **Brand Refresh** — NOT now. Deferred; add later. Rebrand page = website rebuild only.
- ✅ **Nav label** — rename "Pricing" → **"Work With Me"** (hub at `/pricing`).
- ✅ **Shared-asset refactor** — YES, do it first (verify existing pages render identically after).
- Hub page title: use **"How You Can Work With Me"** (Earvin can tweak wording during build).

## 9. Acceptance checklist
- [ ] On a preview branch; production untouched; maintenance mode still on.
- [ ] Hub page with one clickable card per service → dedicated pages.
- [ ] 6 new category pages + updated audit page, all from the shared template & config.
- [ ] Rebrand page = website rebuild only (Brand Refresh deferred, not built).
- [ ] Nav label is "Work With Me" (→ `/pricing` hub).
- [ ] Migration & Partnership show "starts at/from … · scoped" with call CTAs (no buy button).
- [ ] Shared `site.css` / `pricing.js` / `layout.js` in use; no duplicated config.
- [ ] Comparison table moved to `/audit`.
- [ ] Nav, homepage links, sitemap, canonicals, JSON-LD all updated to new pages.
- [ ] No guarantee/"manager"/hourly language; dark+gold design native throughout.
- [ ] Every page previewed + screenshotted for review; nothing merged/deployed until approved.
