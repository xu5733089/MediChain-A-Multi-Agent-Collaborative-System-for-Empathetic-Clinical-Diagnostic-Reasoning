# Retrospective B — MediChain
**Team:** 9900-W18C-CAKE · UNSW COMP9900  
**Sprint:** Demo B  
**Date:** April 2026

---

## Team Members

| Name | Role |
|------|------|
| [Name 1] | Team Lead / Backend |
| [Name 2] | Frontend / UI |
| Zeyi Xu | Full-Stack / AI Integration |
| [Name 4] | RAG / NLP |
| [Name 5] | Testing / DevOps |

> **Note:** Replace placeholder names above with actual team members before submission.

---

## 1. Assessment of "Things to Try" from Retrospective A

The following items were identified at the end of Sprint A as areas to work on. Below is a detailed assessment of how effectively each was implemented during Sprint B, including observed impacts, benefits, and limitations.

### 1.1 Daily Async Standups via Team Chat

**Effectiveness: High**

We committed to posting a short daily update (what we did, what we're doing, any blockers) in our group chat rather than holding synchronous meetings every day. This proved effective throughout Sprint B. Having a written record of progress meant that team members working across different time zones or schedules could stay aligned without coordinating meeting times. When a blocker was raised (e.g., the Anthropic API quota being exhausted mid-sprint), the team was aware within hours rather than days, allowing rapid triage.

- **Benefit:** Reduced time lost to scheduling overhead; blockers surfaced faster.
- **Limitation:** Some updates were too brief to be meaningful ("done some backend stuff"). We occasionally had to follow up asynchronously to get enough detail to identify dependencies. The format needs to be more structured (blocked / not blocked / PR link) to be consistently useful.

### 1.2 Define API Contracts Before Implementation

**Effectiveness: Moderate**

Coming into Sprint B, we agreed to document the shape of key API endpoints (request/response schemas) in a shared doc before building both sides. This was partially followed. The `/api/session/start`, `/api/session/chat`, and `/api/session/diagnose` interfaces were agreed on upfront, and this saved significant rework — the frontend `api.js` client was written once and rarely needed to change. However, for newer endpoints added mid-sprint (e.g., `/api/sessions/{id}/uploads`, file analysis endpoints), the contract was defined ad-hoc, leading to a mismatch where the frontend expected a flat array but the backend initially returned a wrapped object. This required a patch.

- **Benefit:** Core consultation flow was integrated smoothly without major interface mismatches.
- **Limitation:** The discipline broke down under time pressure for secondary features. The habit needs to extend to all new endpoints, not just the main ones.

### 1.3 Conduct Code Reviews Before Merging to Main

**Effectiveness: Moderate–Low**

We agreed each PR needed at least one teammate review before merging. In practice, this happened for larger features (the RAG hybrid search upgrade, the multimodal upload pipeline) but was skipped for smaller UI changes and hotfixes. The code reviews that did happen caught real issues — a reviewer noticed that the BioLORD embedding model was being re-initialised on every query rather than cached, which would have caused severe latency in production. On the other hand, several CSS/layout bugs (including a `position: fixed` inside a CSS transform stacking context that caused the chat page to go blank) slipped through because small frontend commits were self-merged.

- **Benefit:** Caught a critical performance regression in the embedding pipeline early.
- **Limitation:** Inconsistently applied. The team needs a clearer threshold for what counts as "small enough to self-merge" versus requiring review. No threshold was defined, so individuals made subjective calls.

### 1.4 Agree on a Shared Development Environment Setup

**Effectiveness: High**

We added a `README.md` section with step-by-step environment setup instructions (Python venv, `.env` template, Vite dev server, Qdrant/ChromaDB initialization). New team members could get the project running without one-on-one help sessions. This was particularly valuable because one team member joined the sprint late due to assignment conflicts. They were onboarded within half a day.

- **Benefit:** Eliminated "works on my machine" friction; dramatically reduced onboarding time.
- **Limitation:** The instructions became slightly stale as dependencies changed (e.g., when we added `google-cloud-speech` for audio transcription, the README was updated three days after the dependency was added). Documentation maintenance needs to be part of the PR checklist, not an afterthought.

---

## 2. What Went Well

### Technical

**Multi-agent pipeline reliability improved significantly.**  
In Sprint A, the three-agent chain (Interviewer → Diagnostician → Critic) would occasionally produce malformed JSON, breaking the frontend. In Sprint B, we added structured prompt constraints with explicit JSON schema specifications and a fallback parser. The pipeline now completes without errors in over 95% of test runs.

**RAG quality leap with hybrid search.**  
Upgrading from simple BM25 keyword search to a hybrid dense+sparse retrieval strategy (BioLORD-2023-M 768-dimensional embeddings for semantic similarity + BM25 for exact term matching, fused via Reciprocal Rank Fusion) produced noticeably more relevant literature references. The knowledge base grew to over 47,000 indexed PubMed documents. Relevance scores now surface in the UI, giving users transparency into how strongly each reference supports the diagnosis.

**Multimodal input pipeline delivered end-to-end.**  
Supporting medical images (X-ray, photos), audio transcription, and video frame extraction in a single unified upload component was a technically ambitious goal. All three modalities work end-to-end: images are analysed via Claude Vision, audio files are transcribed via Google Speech Recognition, and videos undergo OpenCV frame extraction before per-frame Claude Vision analysis. This significantly differentiates MediChain from simpler chatbot-style diagnostic tools.

**Frontend UX improvements landed smoothly.**  
The new features — SOCRATES progress bar, typewriter streaming for AI replies, animated diagnosis probability bars, redesigned literature cards with relevance mini-bars, and symptom quick-select tags — were all implemented without breaking existing functionality. The page transition animations and Markdown rendering in the results tabs add a level of polish that makes the demo significantly more compelling.

**Provider Dashboard is genuinely useful.**  
The addition of real-time statistics (total consultations, today's consultations, severe cases, unique patients) and role-based access control gives the Provider view a professional feel that Demo A lacked entirely.

### Teamwork

**Task ownership was clearer this sprint.**  
Each major feature was assigned to a single named person at the start of the sprint. This meant that when questions arose about a feature's status, there was a clear point of contact. In Sprint A, ambiguous ownership led to two people duplicating work on the same component.

**Communication around blockers improved.**  
When the Anthropic API quota was exhausted mid-sprint (preventing integration testing of the agent pipeline), the blocker was raised immediately in the group chat and the team adapted quickly — using cached/mocked responses for frontend development in parallel while the API limit reset. This kind of nimble response to unexpected blockers was absent in Sprint A.

---

## 3. What Did Not Go So Well

### Technical

**CSS/layout bugs introduced by page transitions.**  
Adding the `page-fade` animation wrapper (which uses a CSS `transform: translateY`) around the router outlet created a new CSS stacking context. This caused the ChatPage — which had previously used `position: fixed` for its full-screen layout — to render off-screen (blank page). The root cause (transforms creating stacking contexts that break fixed positioning) is a well-known CSS behaviour, but it was not caught in review because the fix seemed simple. The bug was only discovered when testing the deployment in a full-screen scenario. More systematic cross-page navigation testing would have caught this earlier.

**RAG ingest pipeline is slow and blocking.**  
Ingesting 47,000+ PubMed documents into ChromaDB takes a significant amount of time and must currently be run manually via a POST endpoint. There is no incremental update mechanism — a full re-ingest is needed when adding new topic terms. During Sprint B, this caused delays when we wanted to expand coverage to new medical domains for the demo. A background job with incremental upsert would significantly improve the developer experience.

**No automated tests.**  
The entire codebase — both backend agents and frontend components — has zero automated tests. Every feature is manually verified. This makes it difficult to catch regressions when refactoring. In Sprint B, changes to the agent prompt format for CoT (chain-of-thought) reasoning inadvertently broke the structured output parsing for existing sessions, which was only discovered during manual testing the day before Demo B.

**Backend error messages are not surfaced to users clearly.**  
When the backend returns a 5xx error (e.g., Claude API rate limit, ChromaDB timeout), the frontend logs the error but shows the user a blank state with no explanatory message. Users have no way of knowing whether the system is loading, the API is busy, or they need to take action. This led to confusion during internal testing ("is the API used up?").

### Teamwork

**Inconsistent Git commit discipline.**  
Commit messages ranged from highly descriptive ("feat: add BioLORD-2023-M hybrid dense+sparse RAG with RRF fusion") to entirely uninformative ("fix", "update", "wip"). This made `git log` unreliable as a record of changes. When debugging the chat page blank issue, tracing which commit introduced the regression was needlessly difficult.

**Sprint planning was too feature-focused.**  
The Sprint B planning session focused almost entirely on which features to add. Very little time was spent on risk assessment (what could break?), technical debt (what from Sprint A needs cleaning up?), or testing strategy. As a result, several improvements were made opportunistically rather than systematically, and some introduced regressions.

**Documentation lagged behind implementation.**  
The README was updated for the core setup steps, but inline code comments, API endpoint documentation, and the agent prompt rationale were not maintained. New team members or external reviewers cannot easily understand why specific architectural decisions were made (e.g., why RRF was chosen over a weighted sum for score fusion).

---

## 4. Things to Try Next Sprint

| # | Item | Type | Owner | Why it matters |
|---|------|------|-------|----------------|
| 1 | Write at least one backend integration test per agent endpoint using `pytest` | Technical | [Name 4] | Catch agent output regressions before manual testing; currently one wrong prompt change can silently break the full pipeline |
| 2 | Add user-facing error toast notifications for all API failures | Technical | [Name 2] | Users currently see a blank screen on API error; a clear "API is busy, please retry" message prevents confusion |
| 3 | Implement incremental RAG ingest (upsert-only, skip existing DOI hashes) | Technical | [Name 1] | Reduce ingest time from hours to minutes when adding new medical topics |
| 4 | Enforce conventional commit format (`feat:`, `fix:`, `chore:` etc.) via a pre-commit hook | Technical | Zeyi Xu | Makes `git log` useful; simplifies debugging regressions |
| 5 | Add a PR checklist item: "does this touch layout? Test full-screen and mobile" | Teamwork | [Name 5] | The page-fade/fixed-positioning bug would have been caught by a mandatory cross-viewport layout check |
| 6 | Dedicate the first 15 minutes of each sprint planning session to reviewing and retiring technical debt, before discussing new features | Teamwork | [Name 1] | Sprint B planning was entirely feature-focused; technical debt grew and manifested as bugs mid-sprint |
| 7 | Update API documentation (request/response shapes) in the README within the same PR that adds a new endpoint | Teamwork | All (reviewer checks) | Documentation currently lags 3–5 days behind implementation; stale docs cause integration bugs |

---

## 5. Workshop / Lecture Learnings Reflection

| Workshop / Lecture | Attendee(s) | Key Learning | How We Applied It |
|--------------------|-------------|--------------|-------------------|
| **Agile & Scrum Practices** | [Name 1], [Name 2], Zeyi Xu | The importance of limiting work-in-progress and having a clear definition of "done" for each task | We broke Sprint B features into smaller vertical slices (e.g., "literature card redesign" as a standalone task) rather than mixing frontend and backend work in a single ambiguous ticket. This made it easier to mark tasks as truly done rather than "mostly done". |
| **Software Testing & QA** | [Name 4], [Name 5] | The distinction between unit, integration, and end-to-end tests; the cost of defects rises exponentially with the time between introduction and detection | Motivated us to add the pytest integration test item to the "Things to Try" list. We had been ignoring testing under time pressure, but the lecture made clear this is a false economy — the blank ChatPage bug took longer to debug than a test would have taken to write. |
| **AI Ethics & Responsible AI** | All members | Medical AI systems must be transparent about their limitations; users should never be left with the impression that an AI diagnosis is authoritative | We ensured the disclaimer banner ("Educational Use Only — not certified medical advice, consult a qualified professional") is prominent on every page. The Critic Agent's safety review step was specifically designed with this in mind: it flags high-risk symptoms (chest pain, suicidal ideation) with a visible warning and urgent care recommendation rather than proceeding silently. |
| **System Architecture & Scalability** | [Name 1], Zeyi Xu | Stateless service design; separation of concerns between compute and storage layers | Led to the decision to use ChromaDB/Qdrant as a separate vector store rather than embedding it in the FastAPI process, and to store session state in SQLite rather than in-memory — so that the backend can be restarted without losing consultation history. |
| **UX Design & User-Centred Design** | [Name 2], [Name 5] | Progressive disclosure: show users what they need when they need it, not all at once | Applied to the SOCRATES progress bar — it only appears during the interviewing phase, not during analysis or when results are shown. The reasoning panel (agent logs) is hidden by default and revealed on demand, so it doesn't overwhelm non-technical users. |

---

*Retrospective facilitated by [Name 1]. Document prepared by the team collectively.*
