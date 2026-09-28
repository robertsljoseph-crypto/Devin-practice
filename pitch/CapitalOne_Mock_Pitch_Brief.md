# Devin x Capital One — Mock Presentation Brief

Companion to `Cognition_Devin_CapitalOne_Deck.pptx`. Five new slides were inserted into your deck:

| # | Slide | Where it sits | Purpose (per the exercise brief) |
|---|-------|---------------|----------------------------------|
| 3 | Our understanding of Capital One | after Agenda | Recap business + objectives + how we help; drive discovery |
| 4 | Where Devin moves Capital One's initiatives | after slide 3 | Value framing: initiative -> engineering work -> Devin surface -> outcome |
| 10 | Demo repo: capitalone/DataProfiler | before "Meet Devin" section | Why this repo tells the story |
| 11 | Live demo storyline | before "Meet Devin" section | 5 surfaces (Wiki, Sessions, Review, Automations, Security), each tied to an initiative |
| 17 | Devin vs. Copilot, Cursor, Claude Code | after "Where Devin delivers first" | Competitive objections and differentiators |

All Capital One facts on those slides are public as of my knowledge and are flagged in the speaker notes for re-verification the morning of (revenue and account counts, Discover integration milestones, CIO / Chief Technology Risk Officer names, current AI product names, competitor feature rows).

---

## 1. Why Capital One

- **A bank that talks like a tech company.** Capital One was the first large US bank to go all-in on the public cloud (closed its last data centre in 2020, runs on AWS) and employs roughly 14,000 technologists. Its leadership publicly frames developer productivity and AI as competitive advantages, so "autonomous software engineer" lands as a business conversation, not an IT one.
- **A giant, well-specified backlog: the Discover integration.** Capital One closed the acquisition of Discover in 2025. Merging two card platforms, two networks and two engineering estates is exactly the kind of migration, upgrade and re-test work Devin is built for (the Nubank story in your deck is the proof: an 8-year migration done in ~12 months).
- **Peer proof.** Goldman Sachs uses Devin. "Your direct peer in a regulated bank already got this through Technology Risk" is the strongest sentence in the pitch.
- **Public repos maintained by the company.** github.com/capitalone has active OSS: DataProfiler, rubicon-ml, Hygieia, cloud-custodian (originated there). You can demo on their own code.
- **A CISO story that is not theoretical.** Capital One lived through a major 2019 cloud data breach and a regulatory consent order. Data governance and PII controls are board-level. DataProfiler, a sensitive-data detection library, puts the demo right on that nerve, positively.
- **Competitive pressure is real.** Capital One has GitHub Copilot deployed at scale and, like every large bank, is evaluating Cursor and Claude Code. Slide 17 and section 5 prepare you.

Why not Morgan Stanley: it has very few public repos, so the demo would run on someone else's code and the "your codebase" moment is lost. The pain points are otherwise identical; if the hiring manager prefers MS, keep the structure and swap the recap facts and repo.

---

## 2. Roles to assign (send these in the email)

Ask for three people. If you only get two, drop the business stakeholder and have the CIO cover it.

| Role | What they own | What they care about in this meeting | What they will push on |
|------|---------------|--------------------------------------|------------------------|
| **CIO / Head of Technology** (at a bank, engineering sits under the CIO, so this is your economic buyer) | The technology org, platforms, cloud, developer productivity, the Discover integration delivery | Capacity for the integration, velocity, quality, fit with Copilot already deployed, cost per PR | "We have Copilot everywhere." "How do I trust autonomous code in a bank?" "How does this get through Tech Risk?" |
| **CISO / Chief Technology Risk Officer** | Security policy, third-party risk, regulatory compliance (OCC, Fed, GLBA, PCI), vendor review | Data handling, where code runs, agent identity and scoping, auditability, model training on code, blast radius | "Does our code leave our tenancy?" "Can it run in our VPC?" "Show me the audit log." "What does the regulator see?" |
| **Business stakeholder** (e.g., EVP Card, or Head of Discover Integration) | A P&L or the integration programme; owns outcomes not tooling | Time to integration synergies, customer-facing delivery, measurable ROI, team disruption | "How do I measure this?" "Will my engineers resist it?" "What is the pilot ask of my teams?" |

**CTO vs CIO vs CISO in one line each**

- **CTO** builds the product: architecture, engineering, the code that makes money. At a software company the CTO is the buyer. At a bank the title exists but usually reports to the CIO or owns a narrower platform remit.
- **CIO** runs technology for the business: infrastructure, engineering, vendor management, the tech budget. At Capital One the CIO is the executive who owns the ~14,000 technologists and the integration, so they are your buyer. Treat them like a CTO with a procurement hat.
- **CISO / Chief Technology Risk Officer** protects the bank: security, compliance, third-party risk. The CISO cannot say yes, but can say no, and at a bank "no" comes with regulatory teeth. Your job is to remove their reasons to say no.

If the panel offers a **CTO** instead of a CIO, run the same script: the CTO gets the velocity and competitive questions.

---

## 3. Demo repo: capitalone/DataProfiler

- https://github.com/capitalone/DataProfiler — Capital One's open-source Python library that loads a dataset (CSV, Parquet, JSON, Avro, text), profiles it (schema, statistics, nulls, uniqueness) and detects sensitive data (PII / NPI) with a pre-trained ML labeler. ~60k lines of Python, hundreds of pytest tests, GitHub Actions CI on Python 3.10-3.13, pre-commit enforced, commits in the last month.
- Big enough to be credible ("this is not a toy"), structured enough for the Wiki to explain in one page: `data_readers/` -> `profilers/` -> `labelers/` -> `report()`.
- It is a data-governance tool from a bank whose defining incident was a data breach. Every improvement is a control getting stronger, which is the bridge to the CISO and the compliance story.

**Prep (do this at least a day before):**

1. Fork `capitalone/DataProfiler` into your own GitHub org. Connect that org to your Devin workspace.
2. Confirm Devin can run the tests: `pip install -e ".[ml,reports]" -r requirements-dev.txt -r requirements-test.txt` then `pytest dataprofiler/tests/profilers/test_profile_builder.py -q` (the full suite takes a while; scope the demo run to the profiler tests). Save the setup to the environment blueprint so sessions start fast.
3. Generate the Devin Wiki / DeepWiki for the fork.
4. Run the demo session once end to end the night before and keep the resulting PR open. That is your fallback.
5. Create the automation (section 4, step 4) so it already has a run in its history.
6. Turn on Devin Review for the fork.

---

## 4. Demo script (~15 min inside the 40)

Kick off the Session **before** you start the Wiki walkthrough so it is finishing by the time you get to step 2.

**Step 1 — Wiki (3 min) · ties to: onboarding two engineering cultures**
- Open the Wiki for the fork. Show the architecture page: `Data` readers -> `Profiler` -> column profilers -> `DataLabeler` -> `report()`.
- Ask Devin: "How does `Profiler.report()` choose an output format, and where are the formats tested?" Read the answer aloud. Line: "This is what a Discover engineer gets on day one of working in a Capital One repo, instead of interrupting a senior engineer."

**Step 2 — Session (5 min) · ties to: data governance tooling; AI at scale**
- Prompt (from Slack if you can, otherwise the app):
  > `@Devin` In the DataProfiler fork, add a `markdown` option to `report_options["output_format"]` alongside `pretty`, `compact`, `serializable` and `flat` in `dataprofiler/profilers/helpers/report_helpers.py`. It should render the global stats and each column's stats as Markdown tables suitable for pasting into a PR or a data-governance ticket, handle nested dicts / None / numpy types the same way `pretty` does, include unit tests next to the existing report-format tests, and add a line to the changelog. Run the profiler tests and pre-commit, then open a PR.
- Show: the plan Devin drafts; the sandboxed VM; the test run; the PR with rationale. Line: "The unit of delivery is a pull request that passed your tests and your linters, not a code suggestion."
- If the live run is slow, switch to the PR from the night before and narrate the session transcript.

**Step 3 — Review (2 min) · ties to: compliance evidence; quality**
- Open the PR; show Devin Review comments (edge cases such as nested stats or None values, type hints, conventions the pre-commit config enforces). Ideally have one finding you ask Devin to fix in-session. Line: "Every PR, human or Devin, gets this second reader. At a bank, that is audit evidence generated as code ships."

**Step 4 — Automation (2 min) · ties to: security posture; CVE debt**
- Show a scheduled automation on the fork: weekly `pip-audit` / dependency sweep that opens PRs for vulnerable or outdated packages and posts a summary to Slack. Show one past run. Line: "Across thousands of repos this is how mean time to patch goes from weeks to days without a war room."

**Step 5 — Security (3 min) · ties to: bank-grade governance**
- Settings tour aimed at the CISO: SSO/SCIM, repo-level scoping, GitHub App identity (not a personal token), secrets vault (secrets injected at runtime, never in transcripts), session audit log (every command replayable), data retention controls, no training on customer code, VPC deployment option. Mention Goldman Sachs went through this review.
- Close the demo by pointing back to slide 4: "Five things you just saw, five rows on the table."

Integrations are visible throughout (Slack trigger, GitHub PR, CI status) — call them out rather than giving them their own step.

---

## 5. Competitive objections (Copilot / Cursor / Claude Code)

Rule: never attack tools Capital One already rolled out. Frame as complementary, then differentiate on three axes.

**The one-liner:** "Copilot makes your engineers faster. Devin adds engineers."

**Three differentiators**
1. **Autonomous, parallel, sandboxed execution to a merged PR.** Copilot/Cursor/Claude Code need a developer at the keyboard and run on the developer's machine. Devin runs unattended on its own VM, runs the suite, fixes CI, drives a browser, and you can run twenty at once against an integration backlog.
2. **Org-wide compounding knowledge.** Copilot context is per user; Cursor rules and CLAUDE.md are per repo and hand-maintained. Devin Wiki, Knowledge, Playbooks and Review are shared across the org and improve with every session. For two merging engineering orgs that matters more than usual.
3. **An enterprise control plane Technology Risk can govern.** Scoped GitHub App identity, secrets vault, immutable session logs, VPC option, automations with named owners. Claude Code in particular runs with whatever access the developer's laptop has.

**Objection responses**
- *"We have Copilot on every desk; why pay twice?"* Different job. Copilot is for the engineer in the loop; Devin is for the backlog nobody is in the loop on. Customers run both. Measure Devin on merged PRs per week and hours reclaimed, not on autocomplete acceptance rate.
- *"Claude Code can do multi-step tasks too."* Yes, interactively, on one machine, with the developer's credentials. Devin adds the parts a bank needs at scale: isolation, parallelism, audit, scheduling, and a shared knowledge layer.
- *"Copilot has a coding agent now."* Good — the market agrees the unit of work is the task, not the line. Devin has been doing this since 2024 with the environment, Wiki and Review layers built for large messy codebases; ask to see them side by side on a real integration repo in the pilot.
- *"AI-written code is not trustworthy in a regulated bank."* Neither is unreviewed human code. Devin never merges; branch protection and CODEOWNERS are unchanged; Review adds a second reader on every PR; every session is replayable for an auditor. Goldman Sachs made this case to its own regulators.
- *"How is Devin different from just using a frontier model?"* Model quality is table stakes and Devin uses frontier models. The product is everything around the model: the environment, the tooling, the memory, the guardrails and the workflow integration.

---

## 6. Agenda email (send ahead)

> **Subject:** Cognition x Capital One — Devin discovery & demo, [date], 40 min
>
> Hi [names],
>
> Thank you for the time on [date]. Below is the agenda and the roles I would like you to play so I can run this as close to a real customer meeting as possible.
>
> **Target prospect:** Capital One. I will be pitching Devin against Capital One's stated priorities — delivering the Discover integration, scaling AI across the bank under bank-grade governance, strengthening data and security controls, and keeping "operate like a tech company" credible. The demo runs on a fork of Capital One's open-source **DataProfiler** library (github.com/capitalone/DataProfiler), which profiles datasets and detects sensitive data.
>
> **Roles**
> - **[Name] — CIO / Head of Technology.** Owns the ~14,000-person technology org, the cloud platform and integration delivery. Please push on capacity, velocity, and how Devin compares to GitHub Copilot, Cursor and Claude Code.
> - **[Name] — CISO / Chief Technology Risk Officer.** Owns security, compliance and third-party risk. Please push on data handling, where the agent runs, what it can access, auditability and what a regulator would see.
> - **[Name] — EVP, Card / Discover Integration (business stakeholder).** Owns the integration outcomes and customer-facing delivery. Please push on measurable results, team adoption, and what a pilot would ask of your teams.
>
> **Agenda (40 min)**
> 1. Intros and what I understand about Capital One's business and priorities — please correct me (7 min)
> 2. Cognition in brief and the shift from copilots to autonomous engineers (5 min)
> 3. How Devin maps to your initiatives (5 min)
> 4. Live demo on capitalone/DataProfiler: Wiki, Sessions, Review, Automations, Security (15 min)
> 5. Customer proof points (incl. Goldman Sachs) and business case (3 min)
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
| 2–9 | 3 | Recap + questions. Do not leave until the CIO and CISO have each answered one question. |
| 9–14 | 5–8 (Cognition, market, shift) | Fast. One story per slide. |
| 14–19 | 4, 10, 11 | Value table, why DataProfiler, demo storyline. Start the Devin session at minute 14. |
| 19–34 | Demo | Live app. Fall back to last night's PR if needed. |
| 34–37 | 17–22 | Competitive slide only if asked; Goldman and Nubank stories, ROI. |
| 37–40 | 24–26 | Pilot proposal (suggest: one Discover-integration migration team + DataProfiler-style tooling team, 6 weeks) and close with a question. |

Appendix (discovery question banks, security detail, objections) stays in the back for Q&A.
