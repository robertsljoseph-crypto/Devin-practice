# Devin x Shopify — Mock Presentation Brief

Companion to `Cognition_Devin_Shopify_Deck.pptx`. Five new slides were inserted into your deck:

| # | Slide | Where it sits | Purpose (per the exercise brief) |
|---|-------|---------------|----------------------------------|
| 3 | Our understanding of Shopify | after Agenda | Recap business + objectives + how we help; drive discovery |
| 4 | Where Devin moves Shopify's initiatives | after slide 3 | Value framing: initiative -> engineering work -> Devin surface -> outcome |
| 10 | Demo repo: Shopify/liquid | before "Meet Devin" section | Why this repo tells the story |
| 11 | Live demo storyline | before "Meet Devin" section | 5 surfaces (Wiki, Sessions, Review, Automations, Security), each tied to an initiative |
| 17 | Devin vs. Copilot, Cursor, Claude Code | after "Where Devin delivers first" | Competitive objections and differentiators |

All facts on those slides are public as of my knowledge and are flagged in the speaker notes for re-verification the morning of the presentation (Shopify quarterly numbers, CTO name, memo wording, competitor feature rows).

---

## 1. Why Shopify

- **Well known, and the hiring manager will recognise the angle immediately.** Shopify is the most public "AI-first engineering" story in enterprise software: CEO Tobi Lütke's April 2025 memo made "reflexive AI usage" a baseline expectation and said teams must show why AI cannot do a job before asking for headcount. That is a Devin sales pitch written by the customer.
- **Public repos maintained by the company.** Shopify has hundreds of active OSS repos (liquid, polaris, ruby-lsp, hydrogen, shopify-cli). You can demo on their own code.
- **Realistic competitive pressure.** Shopify engineers already use Cursor, Copilot and Claude Code. The panel will ask about them; slide 17 and section 5 below prepare you.
- **Both CTO and CISO stories are strong.** Largest Rails monolith in the world (modernisation) + millions of merchants trusting the platform (security).

If the hiring manager steers you to a different account, the structure holds: swap the recap slide facts, the repo, and the table rows on slide 4.

---

## 2. Roles to assign (send these in the email)

Ask for three people. If you only get two, drop the business stakeholder and have the CTO cover it.

| Role | What they own | What they care about in this meeting | What they will push on |
|------|---------------|--------------------------------------|------------------------|
| **CTO** (technology & product engineering) | The engineering org, architecture, developer productivity, the roadmap | Velocity, quality, how this fits the AI mandate, how it compares to Cursor/Copilot/Claude Code, whether it works on a real Rails codebase | "We already have Cursor." "How do I trust autonomous code?" "What does it cost per PR?" |
| **CISO** (security) | Security policy, risk, compliance, vendor review | Data handling, where code runs, who the agent authenticates as, auditability, blast radius of a bad PR | "Does our code train your model?" "Can it run in our VPC?" "What can it access?" "Show me the audit log." |
| **VP Engineering / Business stakeholder** (e.g., VP Eng for Storefronts, or VP Merchant Solutions) | A P&L or product area; owns outcomes not tooling | Time-to-market for merchant features, incident reduction, ROI, what changes for their teams | "How do I measure this?" "Will my engineers resist it?" "What is the pilot ask?" |

**CTO vs CIO vs CISO in one line each**

- **CTO** builds the product: engineering teams, architecture, the code that makes money. At a software company like Shopify, the CTO is your economic buyer.
- **CIO** runs the business's internal IT: ERP, corporate systems, procurement, IT service desk, vendor management. Relevant at banks or manufacturers where engineering sits under IT; less central at Shopify. If the panel offers a CIO, treat them as the procurement / vendor-risk / budget owner.
- **CISO** protects the business: security policy, compliance (SOC 2, PCI — very relevant for a payments platform), vendor security review. The CISO cannot say yes, but can say no. Your job is to remove their reasons to say no.

---

## 3. Demo repo: Shopify/liquid

- https://github.com/Shopify/liquid — Ruby template engine that renders every Shopify storefront theme. ~7k lines of Ruby in `lib/`, comprehensive Minitest suite, GitHub Actions CI, actively maintained (commits in the last two weeks).
- Small enough for the Wiki to index quickly and for the room to follow; important enough that "a bug here shows up on real storefronts" lands.
- Security-relevant by design (renders untrusted merchant templates) — natural bridge to the CISO conversation.

**Prep (do this at least a day before):**

1. Fork `Shopify/liquid` into your own GitHub org. Connect that org to your Devin workspace.
2. Confirm Devin can run the tests: `bundle install && bundle exec rake test`. Save the setup to the environment blueprint so sessions start fast.
3. Generate the Devin Wiki / DeepWiki for the fork.
4. Run the demo session once end to end the night before and keep the resulting PR open. That is your fallback.
5. Create the automation (section 4, step 4) so it already has a run in its history.
6. Turn on Devin Review for the fork.

---

## 4. Demo script (~15 min inside the 40)

Kick off the Session **before** you start the Wiki walkthrough so it is finishing by the time you get to step 2.

**Step 1 — Wiki (3 min) · ties to: developer ecosystem & onboarding**
- Open the Wiki for the fork. Show the architecture page: parse -> `Template` -> `Context` -> render; how `StandardFilters` are registered.
- Ask Devin: "Where would I add a new standard filter, and what tests and docs need to change?" Read the answer aloud. Line: "This is what a new hire or a theme partner gets on day one instead of interrupting a senior engineer."

**Step 2 — Session (5 min) · ties to: AI mandate; storefront features**
- Prompt (from Slack if you can, otherwise the app):
  > `@Devin` In the Shopify/liquid fork, add an `average` standard filter next to `sum` in `lib/liquid/standardfilters.rb`. It should accept an optional property argument like `sum`, return 0 for empty arrays, ignore nil / non-numeric values consistently with `sum`, include unit tests in `test/integration/standard_filter_test.rb`, and add a line to `History.md` under the unreleased section. Open a PR.
- Show: the plan Devin drafts; the sandboxed VM; the test run; the PR with rationale. Line: "The unit of delivery is a pull request that passed your tests, not a code suggestion."
- If the live run is slow, switch to the PR from the night before and narrate the session transcript.

**Step 3 — Review (2 min) · ties to: storefront reliability**
- Open the PR; show Devin Review comments (edge cases, style vs. repo conventions). Ideally have one finding you ask Devin to fix in-session. Line: "Every PR, human or Devin, gets this. Review quality scales with volume."

**Step 4 — Automation (2 min) · ties to: Rails monolith modernisation; security debt**
- Show a scheduled automation on the fork: weekly `bundle outdated` / `bundle audit` sweep that opens PRs for gem updates and posts a summary to Slack. Show one past run. Line: "This is how dependency and CVE debt stops accumulating between annual upgrade pushes."

**Step 5 — Security (3 min) · ties to: merchant trust**
- Settings tour aimed at the CISO: SSO/SCIM, repo-level scoping, GitHub App identity (not a personal token), secrets vault (secrets injected at runtime, never in transcripts), session audit log (every command replayable), data retention, no training on customer code, VPC deployment option.
- Close the demo by pointing back to slide 4: "Five things you just saw, five rows on the table."

Integrations are visible throughout (Slack trigger, GitHub PR, CI status) — call them out rather than giving them their own step.

---

## 5. Competitive objections (Copilot / Cursor / Claude Code)

Rule: never attack tools Shopify already loves. Frame as complementary, then differentiate on three axes.

**The one-liner:** "Cursor and Copilot make your engineers faster. Devin adds engineers."

**Three differentiators**
1. **Autonomous, parallel, sandboxed execution to a merged PR.** Copilot/Cursor/Claude Code need a developer at the keyboard and run on the developer's machine. Devin runs unattended on its own VM, runs the suite, fixes CI, drives a browser, and you can run twenty at once on a migration backlog.
2. **Org-wide compounding knowledge.** Copilot context is per user; Cursor rules and CLAUDE.md are per repo and hand-maintained. Devin Wiki, Knowledge, Playbooks and Review are shared across the org and improve with every session.
3. **An enterprise control plane the CISO can govern.** Scoped GitHub App identity, secrets vault, immutable session logs, VPC option, automations with owners. Claude Code in particular runs with whatever access the developer's laptop has.

**Objection responses**
- *"We have Cursor on every desk; why pay twice?"* Different job. Cursor is for the engineer in the loop; Devin is for the backlog nobody is in the loop on. Customers run both. Measure Devin on merged PRs per week and hours reclaimed, not on autocomplete acceptance rate.
- *"Claude Code can do multi-step tasks too."* Yes, interactively, on one machine, with the developer's credentials. Devin adds the parts an enterprise needs at scale: isolation, parallelism, audit, scheduling, and a shared knowledge layer.
- *"Copilot has an agent mode / coding agent now."* Good — the market agrees the unit of work is the task, not the line. Devin has been doing this since 2024, with the environment, Wiki and Review layers built for large messy codebases; ask to see it on Shopify's monolith side by side in the pilot.
- *"AI-written code is not trustworthy."* Neither is unreviewed human code. Devin never merges; your branch protection and CODEOWNERS are unchanged; Review adds a second reader on every PR.
- *"How is Devin different from just using a frontier model?"* Model quality is table stakes and Devin uses frontier models. The product is everything around the model: the environment, the tooling, the memory, the guardrails and the workflow integration.

---

## 6. Agenda email (send ahead)

> **Subject:** Cognition x Shopify — Devin discovery & demo, [date], 40 min
>
> Hi [names],
>
> Thank you for the time on [date]. Below is the agenda and the roles I would like you to play so I can run this as close to a real customer meeting as possible.
>
> **Target prospect:** Shopify. I will be pitching Devin against Shopify's stated priorities — the "reflexive AI usage" mandate, modernising the world's largest Rails codebase, storefront performance and reliability, and merchant trust. The demo runs on a fork of Shopify's open-source **Liquid** template engine (github.com/Shopify/liquid), which renders every Shopify storefront.
>
> **Roles**
> - **[Name] — CTO.** Owns engineering velocity, architecture and the AI mandate. Please push on how Devin compares to Cursor, Copilot and Claude Code, which Shopify engineers already use.
> - **[Name] — CISO.** Owns security, compliance and vendor risk. Please push on data handling, where the agent runs, what it can access, and auditability.
> - **[Name] — VP Engineering, Storefronts (business stakeholder).** Owns merchant-facing delivery. Please push on measurable outcomes, team adoption, and what a pilot would ask of your teams.
>
> **Agenda (40 min)**
> 1. Intros and what I understand about Shopify's business and priorities — please correct me (7 min)
> 2. Cognition in brief and the shift from copilots to autonomous engineers (5 min)
> 3. How Devin maps to your initiatives (5 min)
> 4. Live demo on Shopify/liquid: Wiki, Sessions, Review, Automations, Security (15 min)
> 5. Customer proof points and business case (3 min)
> 6. Proposed pilot and next steps; Q&A (5 min)
>
> I will leave time for questions throughout — please interrupt in character.
>
> Best,
> [Your name]

---

## 7. 40-minute run of show

| Time | Slides | Notes |
|------|--------|-------|
| 0–2 | 1–2 | Frame: discovery first, demo second. Confirm roles. |
| 2–9 | 3 | Recap + questions. Do not leave until the CTO and CISO have each answered one question. |
| 9–14 | 5–8 (Cognition, market, shift) | Fast. One story per slide. |
| 14–19 | 4, 10, 11 | Value table, why Liquid, demo storyline. Start the Devin session at minute 14. |
| 19–34 | Demo | Live app. Fall back to last night's PR if needed. |
| 34–37 | 17–22 | Competitive slide only if asked; customer stories, ROI. |
| 37–40 | 24–26 | Pilot proposal and close with a question. |

Appendix (discovery question banks, security detail, objections) stays in the back for Q&A.
