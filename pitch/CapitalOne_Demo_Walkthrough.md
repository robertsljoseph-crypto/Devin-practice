# Devin Demo Walkthrough — Capital One / DataProfiler

A hand-holding guide for the 15-minute demo portion. Every step has three parts: **Do** (what to click or type), **Why** (what it accomplishes for the pitch), and **Say** (the line for the room). Read Part A once, then use Parts B and C as your script.

Devin's interface changes often. Menu names below are what they were called most recently; if a label differs, look for the nearest equivalent. Do a dry run with this doc open at least a day before.

---

## Part A. The mental model (read once)

**What Devin is.** Devin is an AI software engineer that works in its own cloud computer (a virtual machine). You give it a task in plain English; it reads the code, makes a plan, edits files, runs the tests, fixes what breaks, and opens a pull request (PR) for a human to review. You watch it work in the browser or from Slack.

**The five surfaces you will show, and what each one is for:**

| Surface | What it is in one sentence | Capital One slide-4 row it proves |
|---|---|---|
| **Wiki** | Auto-generated, always-current documentation of a repo, with a chat box to ask questions about the code | Onboarding two engineering cultures |
| **Session** | One task, one Devin, one VM, from prompt to PR | Discover integration backlog; data-governance tooling |
| **Review** | Devin reads every PR (yours or its own) and leaves review comments | Compliance evidence and quality |
| **Automation** | A scheduled or event-triggered Devin task that runs without anyone asking | Security posture and CVE debt |
| **Security (Settings)** | The admin controls a bank's Technology Risk team needs to sign off | AI at scale under bank-grade governance |

**Integrations** (GitHub, Slack, CI) are not a separate step; they are visible inside the others. Point at them when they appear.

**The story you are telling.** "A Discover engineer joins a Capital One repo on Monday (Wiki). A data-governance ticket comes in on Slack (Session). The PR gets a second reader automatically (Review). Meanwhile Devin keeps the repo patched every week without being asked (Automation). And all of it happens inside controls your CISO can audit (Security)."

**Golden rule:** always have a finished session and open PR from the night before. If the live session is slow, you narrate the finished one. Nobody will know or care.

---

## Part B. Setup — the day before (about 90 minutes)

### B1. Fork the repo

**Do.** Sign in to GitHub. Go to https://github.com/capitalone/DataProfiler and click **Fork** (top right). Fork into your own account (e.g. `robertsljoseph-crypto/DataProfiler`). Leave "Copy the main branch only" checked.

**Why.** You cannot open PRs into Capital One's real repo during a demo, and you should not. A fork is a full copy under your control: same code, same tests, same CI config. Everything Devin does lands in your fork.

### B2. Connect GitHub to Devin

**Do.** In Devin (https://app.devin.ai), open **Settings** (gear icon, bottom left) → **Integrations** → **GitHub**. Click **Install / Configure** and, in the GitHub screen that opens, grant access to **only** the DataProfiler fork (choose "Only select repositories"). Come back to Devin and confirm the repo appears in the list.

**Why.** Devin acts through a *GitHub App*, not a personal password. The App has a scoped identity: it can only see the repos you selected. This is a security talking point you will reuse in Step 5: "Devin has exactly the access you granted it, and nothing else."

### B3. Set up the repo environment (so sessions start fast)

**Do.** In Devin, go to **Settings → Repositories** (sometimes labelled "Environments" or "Machine"), pick the fork and click **Set up** or **Configure**. Devin opens a setup session where it clones the repo and tries to install dependencies. Tell it, in the chat:

> Install DataProfiler for development: `pip install -e ".[ml,reports]" -r requirements-dev.txt -r requirements-test.txt`. Then confirm `pytest dataprofiler/tests/profilers/test_profile_builder.py -q` passes and `pre-commit run --all-files` works. Save this as the repo setup so future sessions start with everything installed.

When it finishes, it will propose saving a "snapshot" or environment configuration. Accept it.

**Why.** Every Devin session starts from a fresh VM. Without a saved environment, each session would spend 5-10 minutes installing Python packages before doing any work. Saving the setup once means the live demo session starts working in under a minute. It also proves a point to the CIO: "Devin learned how to build your repo once; every engineer and every future session inherits that."

### B4. Generate the Wiki

**Do.** In Devin, open **Wiki** (left sidebar; may also be reachable at deepwiki.com for public repos). Click **Add repository** / **Index**, choose the fork, and wait. Indexing a 60k-line repo takes a few minutes. When done, open it and skim the pages so you know where "Architecture", "Data Readers", "Profilers", "Labelers" and "Reports" live.

Then test the question you will ask live. In the Wiki's chat box type:

> How does `Profiler.report()` choose an output format, and where are the different formats tested?

Read the answer. It should point at `dataprofiler/profilers/helpers/report_helpers.py` (the `pretty`, `compact`, `serializable`, `flat` formats) and the tests under `dataprofiler/tests/profilers/`. If it does, you have your Step 1 in the bag.

**Why.** The Wiki is the "day one for a new engineer" story. It also quietly proves Devin has understood the codebase before it touches it, which is what makes the CIO trust the PR later.

### B5. Turn on Devin Review

**Do.** **Settings → Integrations → GitHub → Devin Review** (or **Settings → Review**). Enable it for the fork. Choose "review all PRs" if offered.

**Why.** Review is what makes Step 3 happen automatically: the moment Devin's PR opens, Review comments on it. If you skip this, you will have nothing to show in Step 3.

### B6. Connect Slack (optional but strong)

**Do.** **Settings → Integrations → Slack → Add to Slack**. Pick a Slack workspace you control (a free one is fine). Create a channel called `#eng-data-governance`, invite the `@Devin` bot to it.

**Why.** Kicking the task off from Slack instead of the Devin app is the single most convincing moment of the demo: it shows Devin lives where engineers already work. If Slack setup is a hassle, skip it and start the session from the Devin app; you lose a little polish, not the story.

### B7. Run the demo session once, end to end (your safety net)

**Do.** In Slack (or in Devin: **New session**), send exactly the prompt from Part C, Step 2. Let it run to completion (typically 10-25 minutes). Confirm:
- a PR opened on your fork,
- tests passed in the session,
- Devin Review left comments on the PR.

Leave that PR **open**. Note its URL. Rename the session something obvious like "DEMO BACKUP — markdown report format".

**Why.** This is your fallback. If the live session is slow or the Wi-Fi drops, you open this session's transcript and PR and narrate it. It also tells you whether the prompt needs tweaking before you say it in front of a panel.

### B8. Create the Automation

**Do.** In Devin, open **Automations** (left sidebar) → **New automation**. Configure:
- **Trigger:** Schedule, weekly (e.g., Mondays 07:00).
- **Repo:** the fork.
- **Instructions:**

> Run `pip-audit` and `pip list --outdated` in the DataProfiler repo. For each dependency with a known vulnerability (CVE) or a safe minor/patch upgrade, bump it in `requirements*.txt`, run the profiler tests, and open one PR per dependency with the CVE ID in the title. Post a summary of what was opened (and anything that failed tests) to Slack #eng-data-governance.

- **Deliver to:** Slack channel (if connected).

Save it, then click **Run now** so it has at least one run in its history before the demo.

**Why.** The automation is the "security debt stops accumulating" story. Showing a real past run (with a real PR or a "nothing to patch this week" message) is far stronger than describing it.

### B9. Add one Knowledge item and check Secrets (30 seconds each)

**Do.** **Settings → Knowledge → Add**: "In DataProfiler, all new report output formats must be added to `report_helpers.py` and covered by tests in `dataprofiler/tests/profilers/`. Always run `pre-commit run --all-files` before opening a PR." Then open **Settings → Secrets** and glance at it so you know what it looks like.

**Why.** Knowledge is how a team teaches Devin its conventions once, for everyone. Secrets is where API keys live so they are injected into the VM at runtime and never appear in a transcript. You will point at both in Step 5.

### B10. Dry run

Run Part C once with a timer. Bookmark these tabs in order: (1) Wiki page, (2) Slack channel or Devin new-session page, (3) the backup PR, (4) Automations page, (5) Settings. Close everything else.

---

## Part C. The live 15 minutes

Slide 11 ("Live demo storyline") should be on screen when you say "Let me show you." Then switch to the browser.

### Step 0 (minute 0) — Kick off the Session FIRST

**Do.** Before anything else, go to Slack (or Devin → New session) and paste the Step 2 prompt. Hit enter. Then immediately switch to the Wiki tab.

**Why.** Devin needs 10-20 minutes to finish. Starting it now means it is producing a PR right when you reach Step 2, instead of the room watching a progress bar. Nobody minds that you started it early; say so.

**Say.** "I'm going to hand Devin a real ticket right now, and we'll come back to it. While it works, let me show you what a new engineer sees on day one."

### Step 1 (minutes 1-4) — Wiki: onboarding

**Do.** Open the Wiki for the fork. Show the overview page and the architecture diagram. Click into "Profilers" or "Reports" for five seconds. Then type in the chat box:

> How does `Profiler.report()` choose an output format, and where are the formats tested?

Read the first two sentences of the answer aloud and click one of the file links it cites.

**Why.** Capital One is absorbing Discover's engineers, and both sides have thousands of undocumented services. The Wiki is generated from the code and stays current; nobody has to write or maintain it.

**Say.** "This documentation did not exist yesterday. Devin wrote it from the code, and it re-generates as the code changes. A Discover engineer landing in a Capital One repo gets this on Monday morning instead of booking time with your most senior person. And notice that Devin already understands this codebase, which matters for what comes next."

**Tie to slide 4:** onboarding two engineering cultures.

### Step 2 (minutes 4-9) — Session: ticket to PR

**The prompt** (already sent in Step 0):

> @Devin In the DataProfiler fork, add a `markdown` option to `report_options["output_format"]` alongside `pretty`, `compact`, `serializable` and `flat` in `dataprofiler/profilers/helpers/report_helpers.py`. It should render the global stats and each column's stats as Markdown tables suitable for pasting into a PR or a data-governance ticket, handle nested dicts / None / numpy types the same way `pretty` does, include unit tests next to the existing report-format tests, and add a line to the changelog. Run the profiler tests and pre-commit, then open a PR.

**Do.** Switch to the session. Walk down the screen top to bottom:
1. **The plan.** Devin's first message is a plan: files it will touch, tests it will add. Read two bullets aloud.
2. **The VM.** Show the terminal / editor / browser tabs on the right. Point out it is running `pytest`.
3. **The progress.** Scroll the transcript. If it is mid-run, show it fixing a failing test. If it is finished, click the PR link.
4. **The PR.** Open the PR on GitHub. Show the description (Devin explains what and why), the diff, and the CI status check.

If Devin is still running, say "It's still testing; let me show you the one I ran last night," and open the backup PR. Same narration.

**Why.** This is the core of Devin: a ticket in, a tested PR out, with no one at the keyboard. For the Discover integration that means dozens of these running in parallel against a migration checklist.

**Say.** "This came in as a Slack message. Devin planned it, worked in its own sandboxed machine, ran your test suite and your linters, and opened a pull request. The unit of delivery is a PR that already passed your tests, not a code suggestion someone has to finish. Now imagine twenty of these running at once against the Discover migration backlog. That is how Nubank did an eight-year migration in twelve months."

**What to point at for the CISO:** "The PR is opened by the Devin GitHub App, not by anyone's personal account. It cannot merge; your branch protection is untouched."

**Tie to slide 4:** data-governance tooling; Discover integration at scale.

### Step 3 (minutes 9-11) — Review: the second reader

**Do.** On the PR (live or backup), scroll to the comments. Devin Review will have left inline comments: an edge case (e.g., nested dictionaries or `None` values), a type hint, a style rule. Pick one and read it aloud. If time allows, reply in the PR or in the session: "Devin, address the review comment about None values" and show it acknowledge.

**Why.** At a bank, code review is a control, and it is the control that gets thin when volume goes up. Review gives every PR a consistent second reader and leaves a written trail.

**Say.** "Every PR in this repo, whether a human or Devin wrote it, gets this. It reads the whole repo for context, not just the diff. For your Technology Risk team this is audit evidence being generated as code ships, not reconstructed at exam time."

**Tie to slide 4:** compliance evidence and quality.

### Step 4 (minutes 11-13) — Automation: keep it patched

**Do.** Open **Automations**. Click the weekly dependency/CVE sweep. Show the schedule, the instructions, and the **past run** from yesterday. If it opened a PR, click it. If it posted to Slack, show the Slack message.

**Why.** Vulnerability and dependency debt is a bank-wide, never-ending chore across thousands of repos. Automations turn it from an annual war room into a weekly background task with a named owner.

**Say.** "Nobody asked Devin to do this; it runs every Monday. Multiply this by a few thousand repos and mean time to patch drops from weeks to days, and the summary lands in the channel your security team already watches. You can build the same thing for framework upgrades, flaky tests, or Discover-to-Capital One migration checks."

**Tie to slide 4:** security posture and CVE debt.

### Step 5 (minutes 13-15) — Security: the Technology Risk view

**Do.** Open **Settings** and walk through, briefly, top to bottom:
- **Members / SSO:** "Access via your identity provider, SCIM provisioning, roles."
- **Integrations → GitHub:** "Scoped GitHub App; you saw it only has the one repo."
- **Secrets:** "Credentials are stored here and injected into the VM at runtime. They never appear in a transcript."
- **Any session → transcript:** "Every command Devin ran is recorded and replayable. This is the audit log."
- Mention verbally: VPC / single-tenant deployment option, data retention controls, and that customer code is not used to train models.

**Why.** The CISO cannot say yes, but can say no. This step removes the reasons to say no.

**Say.** "Everything you just watched happened inside these controls: your identity provider, a scoped app identity, a secrets vault, and a replayable log of every action. This is the same review Goldman Sachs' technology risk team went through, and Devin is in production there today."

**Tie to slide 4:** AI at scale under bank-grade governance.

### Close (minute 15)

**Do.** Switch back to the deck, slide 4.

**Say.** "Five things you just saw, five rows on this table. Each one maps to an initiative you told me about at the start." Then move to customer stories and the pilot.

---

## Part D. If something goes wrong

| Problem | What to do | What to say |
|---|---|---|
| Live session is slow or stuck | Open the backup session and PR from B7 | "Still running the suite; here is the one from last night so you can see the finished result." |
| Wiki chat gives a vague answer | Click the Architecture page instead and narrate it | "The generated docs cover it; let me show you the page." |
| Devin Review left no comments | Show the Review settings toggle and the backup PR's comments | "Review runs on every PR; here is what it flagged last night." |
| Automation has no past run | Click "Run now" and show it start; describe the Slack summary | "It kicks off on schedule; here it is starting." |
| Slack integration not working | Start the session from the Devin app | "Normally this comes from Slack or Jira; same thing from the app." |
| Internet drops | Screenshots of each step saved to your desktop (take them during the dry run) | "Let me walk you through it from screenshots." |

Take screenshots of every step during the dry run and keep them in a folder on the desktop. That is your last line of defence.

---

## Part E. Quick reference card (print this)

1. **Min 0:** paste prompt in Slack → start session.
2. **Min 1-4:** Wiki → ask the `report()` question → "day one for a Discover engineer".
3. **Min 4-9:** Session → plan, VM, tests, PR → "a PR that passed your tests, not a suggestion". Backup PR if slow.
4. **Min 9-11:** PR comments → "a second reader on every PR; audit evidence".
5. **Min 11-13:** Automations → past run → "mean time to patch, bank-wide".
6. **Min 13-15:** Settings → SSO, scoped GitHub App, Secrets, transcript → "Goldman went through this review".
7. **Close:** slide 4 → "five things, five rows".
