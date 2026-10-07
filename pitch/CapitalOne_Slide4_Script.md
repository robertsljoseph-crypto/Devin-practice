# Slide 4 — "Where Devin moves Capital One's initiatives": Accuracy Check and Talk Track

Sources checked: devin.ai/customers (full list and metrics), cognition.com/blog (Security Swarm, Vulnerability Remediation Program, COBOL modernization, LTM financial-services partnership, Devin Review, FedRAMP High In-Process), the Itaú and Nubank customer stories, CNBC/TechCrunch/Fortune coverage of Goldman Sachs (July 2025), Capital One Q2/Q3 2026 earnings coverage of the Discover integration, the DX "How Capital One assesses AI readiness" interview with Max Kanat-Alexander (Aug 2026), and Capital One's public GitHub.

---

## Part 1. Accuracy assessment, row by row

Verdict legend: **Accurate** = supported by a public Cognition source; **Adjust** = directionally right but the wording or number should change; **Add** = missing from the slide.

### Row 1 — Discover integration: one platform, one cloud
**Verdict: Accurate, but sharpen the proof point.**
- Capital One facts (public, Sept 2026): Discover card *originations* moved onto Capital One's platform in September 2026; the existing Discover portfolio is migrating in waves from July 2026 to a final wave in **January 2027**; the overall integration is expected to be "substantially complete" by **mid-2027**. Fairbank has said about one-third of the targeted **$1.5B** expense synergies are achieved and the rest is "back-loaded because they depend on completing technology conversions." That last sentence is your hook: the synergies the CFO promised Wall Street are gated on engineering throughput.
- Devin proof: the slide says "Nubank did this 12x faster." The published figure is **8-12x faster and 20x lower cost** on a multi-million-line ETL monolith migration. Use "8-12x faster, 20x cheaper." Even better for a bank: **Itaú** (Brazil's largest bank, 17,000 technologists) migrated 59 services .NET to Java **6x faster at 5x lower cost** and 800 SQL Server objects **5x faster**. Itaú is a bank; Nubank is a neobank. Use both.
- Also relevant: the "Financial Institution" metrics on devin.ai/customers: **8-12x efficiency gain on a dataset migration touching 100,000+ datasets** and **16x acceleration on a data-infrastructure migration to Databricks**.

### Row 2 — Data governance and PII control
**Verdict: Accurate in spirit; the Devin column is the weakest on the slide.**
- The slide ties this row only to the DataProfiler demo task. There is no published Cognition story specifically about PII tooling, so do not over-claim. What *is* published and relevant: Itaú uses Devin as an "institutional knowledge layer" documenting **300,000+ repos**, which is how a bank proves to examiners that it knows what its systems do; and the COBOL blog describes Devin surfacing an undocumented duplicate-transaction safeguard that became "demonstrable to auditors."
- Reframe the Devin column as: "Sessions + Review on data-governance tooling; Wiki as audit-ready system documentation." Business outcome stays: fewer findings, evidence generated as code ships.

### Row 3 — Security posture and vulnerability debt
**Verdict: Under-sold. This is now one of Cognition's strongest, most-documented use cases and the slide only mentions Automations.**
- Cognition shipped **Devin Security Swarm** (July 2026): parallel agents scan the codebase, confirm each vulnerability is exploitable at runtime in a sandbox, then open a remediation PR. Published benchmark: 72% recall vs Claude Security 68%, Codex 48%, Cursor 26%, at ~30% lower cost than the nearest alternative.
- There is a **six-week Devin Security Vulnerability Remediation Program**: Cognition's forward-deployed engineers burn down the CVE backlog, then set up continuous scanning. This is a ready-made pilot proposal for the CISO.
- Itaú: **~70% of SonarQube / Fortify / Veracode findings remediated automatically.**
- Cognition announced a partnership with **LTM to reduce cyber risk in financial services** — worth one sentence to the CISO.
- Change the Devin column to: "Security Swarm + Automations: find, prove exploitable, and fix vulnerabilities; scheduled dependency sweeps." Change the outcome to include "~70% of scanner findings auto-remediated (Itaú)."

### Row 4 — Onboard and align two engineering cultures
**Verdict: Accurate and well supported.**
- Itaú: documentation for 300,000+ repos "generated and continuously updated"; principal engineers design architecture ~10x faster; engineers "query Devin as if consulting a deeply tenured senior engineer."
- FE fundinfo (financial data): scaled engineering capacity across **1,800 repos**. Evinova (regulated healthcare): documentation **8x faster**.
- Keep as is; add "300k repos documented at Itaú" to the outcome cell.

### Row 5 — AI at scale under bank-grade governance
**Verdict: Accurate; two upgrades.**
- Goldman Sachs: CIO Marco Argenti announced the pilot on CNBC (July 2025), "hundreds of instances, potentially thousands," supervised by humans, targeting "drudgery like updating internal code to newer languages." Cognition described Goldman as **"the first major bank to use Devin."** Note: Goldman is not a published case study on devin.ai/customers, so quote the CNBC/Argenti statements, not Cognition metrics.
- Itaú is the stronger governance proof: "one of the largest coordinated AI adoptions within a financial institution globally," 75% of teams using Devin, rolled out "to everyone working with technology at the bank."
- Devin is **FedRAMP High In-Process**. For a bank's third-party-risk team that is a meaningful signal even though they are not a federal agency. Add it to the Devin column.
- Cognition and **AWS** announced a partnership. Capital One is the most AWS-committed large bank in the US. One sentence: "We deploy where you already run."

### What the slide gets wrong or leaves unverified
1. "Nubank did this 12x faster" → use "8-12x faster, 20x cheaper."
2. "Thousands of Python and Java repos" (row 3) is an assumption about Capital One's estate; Capital One is public about Java, Python, Go and heavy AWS, so say "across your Java, Python and Go estate."
3. The slide assumes Capital One runs GitHub Copilot. Not publicly confirmed; ask it as a discovery question instead of asserting it.
4. The "Discover integration" business-outcome cell should name the number: "$1.5B expense synergies, two-thirds still gated on technology conversion."

---

## Part 2. Things NOT on the slide that you should add

**A. Capital One is already building its own autonomous coding harness.** Capital One's public GitHub has `capitalone/context-specs`: "applied harness engineering... you express intent; the harness plans the feature with spec-driven development and implements it slice by slice on its own; you always get back a pull request, either ready to merge or STUCK with a diagnosis." That is, almost word for word, Devin's product. This is the single most important fact for your pitch:
- It proves the CIO already believes in the outcome (autonomous PRs). You are not selling the idea, you are selling the enterprise version: sandboxed VMs, Wiki/Knowledge as the "long-term memory" their README talks about, Review, audit, SSO, parallel scale, and a vendor who maintains it.
- Discovery question: "You've published Context Specs. What has been hardest about running it at scale: the environments, the memory, or the review load?"
- Add a sixth row: **Initiative:** "Scale autonomous engineering beyond a pilot (Context Specs)." **Work it creates:** environments, long-term memory, review capacity, governance. **Devin:** managed harness: snapshots, Wiki/Knowledge/Playbooks, Review, Security controls. **Outcome:** the harness runs across the bank, not one team.

**B. Capital One's own "AI readiness" doctrine.** Max Kanat-Alexander (Executive Distinguished Engineer, Capital One) said publicly in Aug 2026: "AI amplifies everything that is good or bad about a software development lifecycle"; faster coding does not help if engineers wait on review and broken tooling; and he warned of a "vicious cycle" where weak code review plus AI produces convincing bad code. This is a gift:
- Devin Review ("AI to stop slop") and Devin's test-running VM are the direct answer to his vicious cycle. Quote him, then show Review.
- Itaú 2x'ed test coverage (50% to 90%+) with Devin writing tests; another customer maintains >90% coverage with 8x hours efficiency. Add a **test-coverage** row or fold it into row 2/3: "Tests and review capacity are the AI-readiness bottleneck; Devin writes the tests and reads every PR."

**C. Legacy modernization / COBOL.** Capital One exited data centers in 2020 but a top-10 card issuer still carries legacy code, and Discover (founded 1985, formerly Sears/Morgan Stanley) certainly does, plus "legacy vendor connections" Fairbank cited as adding integration complexity. Cognition's COBOL blog: "8 months to 8 days" COBOL migration headline, 73% migration-cost reduction at an automaker, Itaú's mandated tax-ID change across its COBOL estate. Add to row 1 or as a note: "Including whatever legacy and mainframe code Discover brings."

**D. Incident triage / operations.** Modal uses Devin to investigate 80% of incidents before an engineer opens the thread; Ripple Treasury tripled bug-resolution speed. Capital One runs a 24x7 card network now. Worth a line under row 3 or as a sixth use case for the business stakeholder.

**E. Measurable ROI language.** Cognition publishes an "AI Productivity Guarantee" and a blog on estimating agent productivity; The Citation Group story is about measuring ROI; WPP proved 30-40% gains to win a renewal. The business stakeholder will ask "how do I measure this." Have these ready.

---

## Part 3. Talk track for the slide (about 4 minutes)

*Click to the slide. Do not read the table. Stand to the side and walk the rows top to bottom.*

**Open (20 sec).**
"Everything you told me a few minutes ago is on the left of this table. Everything I'll show you in the demo is in the third column. My only goal with this slide is that by the end you can draw a line from each business objective to one thing Devin does, and one number that proves it."

**Row 1 — Discover integration (60 sec).**
"Start with the biggest one. You've moved Discover originations onto your platform; the portfolio converts in waves through January; the integration is substantially complete by mid-2027. Richard Fairbank told the Street that two-thirds of the $1.5 billion in synergies are still back-loaded because they depend on completing technology conversions. In other words, the synergy timeline is an engineering throughput problem.

This is where Devin has the most evidence. Itaú, Brazil's largest bank with 17,000 technologists, migrated 59 services from .NET to Java six times faster at a fifth of the cost, and 800 SQL Server objects five times faster. Nubank refactored a multi-million-line monolith 8 to 12 times faster and 20 times cheaper. The pattern is always the same: a human writes the playbook once, then dozens of Devins run it in parallel, each opening a tested PR. That is what I'll show you in the Session part of the demo, on your own DataProfiler repo."

*Pause.* "Who owns the conversion backlog today, and how is it sequenced — by service, by wave, by team?"

**Row 2 — Data governance (35 sec).**
"Second row, data governance and PII. The repo I'm demoing on is yours — DataProfiler, the sensitive-data detection library your team open-sourced. The point of this row is not just that Devin can add a feature to it; it's that Devin generates the documentation and the review trail your examiners ask for. Itaú keeps continuously-updated documentation on 300,000 repos with Devin. When an auditor asks 'what does this system do and who checked the change,' the answer already exists."

**Row 3 — Security and vulnerability debt (60 sec).**
"Third row, for [CISO name]. Two things. First, the boring one: scheduled Automations that sweep dependencies and CVEs every week across every repo and open PRs — I'll show you one running. Second, the one that's new: Devin Security Swarm. Parallel agents read the whole codebase, not just the diff, find vulnerabilities including chained and business-logic ones, prove each one is actually exploitable in a sandbox, and then write the fix. On a 50-vulnerability benchmark it found 72 percent, versus 68 for Claude, 48 for Codex and 26 for Cursor, at about 30 percent lower cost. At Itaú, roughly 70 percent of SonarQube, Fortify and Veracode findings are now remediated automatically.

Cognition also runs a six-week vulnerability remediation program: our engineers sit with yours, burn down the backlog, then leave the scanning running. If we do a pilot, that is one of the two tracks I'd propose."

*Pause.* "What's the current mean time from a critical CVE being published to it being patched across the estate?"

**Row 4 — Two engineering cultures (35 sec).**
"Fourth row. You're absorbing an engineering organization with its own systems, its own conventions, and some legacy and vendor connections — Fairbank's words — that your modern stack doesn't have. The Wiki I'll open first in the demo is generated from the code and updates as the code changes. A Discover engineer gets a Capital One repo explained on Monday morning without booking your most senior person. Itaú's principal engineers design architecture about ten times faster this way."

**Row 5 — Governance (45 sec).**
"Last row, the one that decides whether any of this happens. Devin runs in its own sandboxed machine, authenticates as a scoped GitHub app, never merges, keeps secrets in a vault, logs every command for replay, supports SSO and SCIM, VPC or single-tenant deployment, and is FedRAMP High In-Process. Your code is not used to train models.

Two peers have already made this case to their risk teams. Goldman Sachs — Marco Argenti announced it on CNBC — is rolling out hundreds of Devins supervised by its engineers, specifically for 'updating internal code to newer languages.' And Itaú has gone bank-wide: 75 percent of teams. And since you're the most AWS-committed bank in the country: Cognition and AWS have a partnership, so we deploy where you already run."

**The row that isn't on the slide (30 sec).**
"One more thing I noticed and want to ask about. Your team has published Context Specs on GitHub — a harness where you express intent and get back a pull request that's either ready to merge or stuck with a diagnosis. That is exactly the model Devin is built on. So I don't think I need to convince anyone here that autonomous PRs are the destination. The question is whether you want to build and operate the harness — environments, memory, review, governance — for 14,000 engineers yourselves, or buy one that Goldman and Itaú already got through risk. What's been hardest about scaling it so far?"

*Let them answer. Then:* "Good — hold that thought, because the demo is built around exactly those pieces. Let me show you."

---

## Part 4. Suggested slide edits (if you regenerate it)
1. Row 1 Devin cell: "...(Itaú: 6x faster .NET→Java; Nubank: 8-12x faster, 20x cheaper)". Outcome cell: "$1.5B synergies, two-thirds gated on tech conversion, pulled forward."
2. Row 3 Devin cell: "Security Swarm + Automations: find, prove exploitable, fix; weekly CVE sweeps." Outcome: "~70% of scanner findings auto-remediated (Itaú); MTTP weeks → days."
3. Row 5 Devin cell: add "FedRAMP High In-Process; AWS partnership." Outcome: "Peer precedent: Goldman Sachs, Itaú."
4. Add Row 6: "Scale autonomous engineering beyond Context Specs" → "Managed harness: snapshots, Wiki/Knowledge/Playbooks, Review, controls" → "The harness runs bank-wide, not one team."
5. Row 3 "thousands of Python and Java repos" → "across your Java, Python and Go estate."
