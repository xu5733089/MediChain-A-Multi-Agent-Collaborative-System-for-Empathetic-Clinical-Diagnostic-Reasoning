# MediChain Final Demo Source Content (Evidence-Based Draft)

## Stage 1 — Core Story: What the System Is, Who It Serves, and How It Works

### What MediChain actually does
MediChain is a multi-agent clinical reasoning prototype that runs an end-to-end consultation loop: symptom intake, structured interview, AI-assisted differential diagnosis, safety review, and report export. In implementation terms, this is not a single chatbot endpoint. The backend orchestrates a staged workflow with explicit session states (`interviewing` -> `analyzing` -> `done`), and the frontend reflects those states in separate user experiences.

The core agent pipeline is implemented as three role-specialized agents:
- Interviewer agent: conducts empathetic SOCRATES-style history taking and decides when enough information has been gathered.
- Diagnostician agent: generates differential diagnoses with retrieved medical evidence.
- Critic agent: performs senior-review style validation, safety flagging, and evidence-gap critique.

This pipeline is visible to users through the chat reasoning panel and persisted in the database as timestamped messages with explicit `agent_type`.

### Problem it solves
The project addresses a practical gap in medical AI demos: many systems can answer questions, but fewer provide structured intake, evidence-grounded reasoning, and safety-aware review in one coherent workflow.

From the implemented behavior, MediChain is solving four concrete problems:
1. Unstructured symptom collection: the Interviewer prompt enforces SOCRATES-based questioning and explicitly forbids early diagnosis.
2. Weak evidence grounding: the Diagnostician uses RAG retrieval results and is instructed to cite evidence using a consistent citation key format.
3. Missing safety guardrails: each user message is safety-classified using a two-layer rule + LLM process, then surfaced in UI and message history.
4. Poor traceability: sessions, turns, uploads, evaluation runs, and exports are persisted, enabling replay and audit.

### Target users and role boundaries
The system is built for two user roles with different permissions:

Patient users can start consultations, upload supporting media, chat through the interview phase, view results, and export reports.

Provider users can monitor sessions across patients, filter by severity/status/date, inspect message timelines, and trigger RAG ingestion to update the knowledge base.

This split is enforced in both frontend routing and backend authorization. For example, RAG ingestion is protected server-side and returns `403` for non-provider users.

### Main user flows implemented today

#### Patient consultation flow
The patient flow starts on the intake page with symptom fields (complaint, body part, duration, severity, history). The patient can also upload medical media before the chat starts. Once submitted, the backend creates a session, runs the first Interviewer response, classifies initial safety risk, and returns a session ID.

In chat, each user turn is persisted, safety is re-classified, and the Interviewer continues follow-ups. Diagnosis is triggered either by an explicit readiness marker (`[READY_FOR_DIAGNOSIS]`) or by a hard turn ceiling (12 turns) to prevent runaway sessions. The diagnose endpoint then runs Diagnostician and Critic, stores outputs, and marks the session complete.

The results page presents diagnosis, critic review, references, transcript, and optional chain-of-thought panel if returned. Users can export PDF and JSON.

#### Provider monitoring and knowledge update flow
The provider dashboard lists sessions across users with filters for status, severity, keyword, and date range. Providers can expand any session to see symptom summary and full message stream, including parsed safety payloads.

Providers can also trigger `/api/rag/ingest` from the dashboard. The UI polls RAG status in near real time and displays document count growth while ingestion is running, then reports final added count.

#### Evaluation flow
The MedQA evaluation page runs built-in USMLE-style sample questions in both single-LLM and multi-agent modes, stores each run in `eval_runs`, and computes aggregate stats (single accuracy, multi accuracy, improvement, per-category breakdown).

### Major implemented features worth demonstrating
The following features are clearly implemented and demo-safe:

Multi-agent staged consultation with explicit state transitions and persisted reasoning artifacts.

Dual role authentication (JWT + role-gated actions) with patient/provider-specific routes and views.

Multimodal analysis endpoints:
- Stateless analysis (`/api/analyze/file`) supports image, DICOM, audio, video, PDF, TXT.
- Session upload (`/api/sessions/{id}/upload`) currently supports image/PDF/TXT in the consultation flow and injects extracted content into session context for subsequent turns.
- OCR endpoint for medical document extraction from image/DICOM.
- Multi-image comparison endpoint for comparative analysis.

Result explainability surfaces:
- Differential diagnosis markdown.
- Critic review markdown.
- RAG references with relevance score and source links.
- Transcript tab for full dialogue replay.
- Optional CoT tab when extended thinking is available.

Exportability and continuity:
- PDF and JSON export endpoints.
- History page with filtering and resume capability.

### Architecture and backend/frontend logic

#### Backend architecture
The backend is FastAPI-based and modularized by concerns:
- `main.py` for API routes and workflow orchestration.
- `agents.py` for agent prompts and Anthropic invocation.
- `rag.py` for vector search and hybrid retrieval.
- `safety.py` for risk classification.
- `auth.py` for JWT/password/role logic.
- `db.py` for schema and migrations.
- `eval.py` for benchmark pipeline.
- `export.py` for report generation.
- `ingest.py` for PubMed ingestion.

Key orchestration logic:
- `start_session`: creates initial case payload, calls Interviewer, stores safety and interviewer messages.
- `chat`: appends user turn, classifies safety, calls Interviewer, conditionally flips status to `analyzing`.
- `diagnose`: builds case text + transcript + uploaded context, runs RAG + diagnosis + critic review, writes final artifacts.

#### Frontend architecture
The frontend is React + Vite with route-level pages and a centralized API client.

Page logic aligns to clinical flow:
- `InputPage`: intake forms + optional quick SOCRATES prefill + pre-consult media analysis.
- `ChatPage`: staged interaction, safety warnings, streaming-style interviewer output, upload/context attachment, and reasoning log.
- `ResultsPage`: multi-tab report with differential confidence visualization and references.
- `HistoryPage`: filterable completed sessions and timeline replay.
- `ProviderDashboard`: cross-patient operations + RAG ingestion control.
- `EvalPage`: side-by-side benchmark interface.

UI behavior is tied directly to backend responses rather than mocked local state, which is important for a reliable final demo narrative.

### Database and storage design
SQLite is used for relational persistence with the following implemented entities:
- `users`: auth identity and role (`patient`/`provider`).
- `patients`: structured patient profile records.
- `sessions`: symptom payload, state, diagnosis/review outputs, references, CoT, timestamps.
- `messages`: normalized timeline with `role` and `agent_type` (`interviewer`, `diagnostician`, `critic`, `safety`).
- `uploads`: file metadata, file type, path, extracted text.
- `eval_runs`: benchmark outputs and correctness flags.

File assets are stored under backend `uploads/<session_id>/...` and linked through `uploads` table metadata.

RAG storage uses Qdrant with both dense and sparse named vectors, plus local BM25 vocabulary parameters. The system supports local embedded Qdrant path mode and host/port mode via environment variables.

### AI/model/agent/workflow implementation details
Model calls are implemented through Anthropic API (`claude-sonnet-4-20250514` in current code).

Interviewer:
- Uses a strict system prompt emphasizing empathy, SOCRATES coverage, concise response length, and no diagnosis.
- Signals handoff with `[READY_FOR_DIAGNOSIS]`.

Diagnostician:
- Retrieves references via multi-query hybrid RAG search.
- Receives case + RAG context and outputs differential diagnosis in a structured markdown format.
- CoT-enabled call is attempted first; fallback to standard call is implemented if needed.

Critic:
- Reviews diagnosis for validation status, evidence quality, gaps/biases, safety flags, and final recommendation.
- Also has CoT-enabled + fallback path.

RAG query enrichment:
- Base symptom query is expanded using an LLM rewrite step for medical terminology.
- Additional perspective queries are generated to improve recall.
- Image-analysis findings can be summarized into medical keywords and appended to retrieval query.

---

## Stage 2 — Non-Functional Requirements, Reliability, Safety, and Engineering Decisions

### Safety, validation, and access control mechanisms
Safety is implemented as an explicit two-layer classifier:
1. Rule-based detection of red-flag symptom patterns (e.g., chest pain + dyspnea, severe bleeding, hemoptysis, unconsciousness).
2. LLM triage classification into low/medium/high risk with strict JSON output expectation.

Final risk is the maximum of rule and LLM levels. High-risk warnings are surfaced in chat UI, and safety payloads are persisted as structured agent messages for retrospective review in history/provider views.

Authentication and authorization:
- Passwords are hashed with bcrypt.
- JWT tokens are issued and validated.
- Required-auth and optional-auth dependencies are separated.
- Role checks gate provider-only operations such as RAG ingestion.

Input and file validation:
- Upload file names are sanitized.
- Allowed file extensions are explicitly whitelisted.
- Image payloads are compressed when needed before vision API calls.
- API routes return clear HTTP errors on unsupported types and processing failures.

### Reliability and exception-handling behavior
The implementation includes practical reliability safeguards:

Turn ceiling protection: chat flow enforces a max turn limit and force-triggers diagnosis if needed, preventing endless interview loops.

Frontend StrictMode duplicate-init guard: backend can reuse very recent untouched sessions with identical payload to avoid accidental duplicate session creation.

Fallback paths:
- Diagnostician/Critic CoT invocation falls back to non-CoT execution on failure.
- Audio transcription errors degrade gracefully with explanatory messages.
- Optional dependencies (e.g., `pydicom`, `opencv`, speech packages) return informative fallback text instead of crashing the service.

Persistence-first design:
Messages and session state are written to DB throughout the flow, so history survives server restart.

### Non-functional qualities reflected in current implementation

Usability:
The app supports a guided consultation arc with clear phase indicators, role-specific views, rich result tabs, and visual cues for safety and reasoning. Input can be symptom-text-led or file-analysis-led, reducing friction in real demos.

Traceability and auditability:
Message-level timelines with role and agent labels make it possible to explain exactly how outputs were produced. Safety decisions are inspectable after the fact.

Maintainability:
Backend is split into coherent modules; frontend API access is centralized; database init includes lightweight migration logic (e.g., `sessions.cot`, expanded upload constraints).

Extensibility:
RAG ingestion is decoupled and callable at runtime. Multimodal handlers are implemented by media type, allowing additional processors without redesigning core consultation flow.

Performance pragmatism:
RAG retrieval uses vector/hybrid search rather than linear scans. Chat UX uses streaming-like rendering and asynchronous transitions. Heavy operations (vision/audio/video analysis) are endpoint-isolated.

### Technical highlights with demo value
The strongest technical highlight is the operationalized multi-agent handoff, not just prompt wording. You can show exactly when the Interviewer hands off, when diagnostic retrieval runs, and how Critic review is attached as a second opinion.

Another standout is multimodal-to-reasoning integration: supported consultation uploads are not only analyzed, but also injected into session context and used in downstream diagnostic reasoning and retrieval query augmentation.

Provider-side live RAG ingestion is also demo-worthy because it demonstrates that the knowledge base is operationally updateable during runtime, not static.

Finally, the built-in evaluation pipeline gives a concrete way to discuss whether multi-agent structure adds value versus single-shot answering.

### Important implementation decisions to explain in presentation
The system deliberately separates:
- conversational interviewing,
- diagnostic synthesis,
- and quality/safety critique,
instead of asking one model to do all tasks in one prompt.

This separation enables cleaner prompts, better explainability, and insertion points for policy controls (especially safety and role boundaries).

The session state machine also matters: it prevents ambiguous behavior and makes UI transitions deterministic, which is crucial in live demo conditions.

---

## Stage 3 — Edge Cases, Likely Q&A, Limitations, and Future Improvements

### Edge cases and unusual conditions worth discussing in Q&A

High-risk symptom detection may trigger warning banners even while interview continues. This is intentional triage signaling, not automatic emergency workflow escalation.

If Interviewer never emits readiness marker, diagnosis still proceeds at max-turn threshold. This ensures completion but may slightly reduce interview completeness in borderline cases.

Multimodal support differs by route:
- Stateless analysis endpoint supports more media types (including DICOM/audio/video).
- Session upload endpoint currently processes image/PDF/TXT in the consultation context path.
For demos, this means image/PDF/TXT is the most reliable in-chat upload scenario.

Chain-of-thought availability is conditional. If CoT call fails, results still complete through fallback without CoT content.

Provider session list includes deduplication heuristics in frontend (same patient + similar complaint within time window), which may merge near-duplicate entries for dashboard readability.

### Honest limitations observed from implementation
This is explicitly an educational/research prototype and not a certified medical device. The code and UI both include medical-use disclaimers.

Clinical correctness still depends on external model behavior and retrieval quality. While evidence scaffolding exists, it does not guarantee medically validated decisions.

External dependency sensitivity remains significant: Anthropic API availability, transcription backend response, and optional Python packages can affect depth of analysis.

Testing coverage is partial. There is a safety-focused test module, but broad backend integration tests and frontend end-to-end test suites are not yet comprehensive.

There are some implementation consistency gaps that should be acknowledged:
- Some UI labels/log text still reference older terminology (e.g., historical mention of another vector store in one chat log string).
- In-session upload handling appears tuned for image/PDF/TXT workflows; broader media write-back path is less mature.

### Realistic future improvements
Near-term improvements with strong ROI:

1. Expand automated tests:
Add integration tests for full session lifecycle, authorization boundaries, and upload-processing branches; add frontend E2E scripts for patient and provider golden paths.

2. Tighten safety governance:
Add prompt-injection defenses for uploaded text/context, richer audit logs, and configurable triage escalation policies.

3. Improve RAG quality:
Introduce reranking, source reliability scoring, and domain-specific corpus partitioning for higher citation relevance.

4. Normalize multimodal session ingestion:
Bring in-chat upload pathway to parity with stateless analysis for audio/video/DICOM where feasible.

5. Enhance provider workflow:
Add provider annotation tools, case review states, and human feedback loops to refine outputs over time.

6. Deployment hardening:
Strengthen secrets management, health checks, and production-ready environment templates.

### Suggested closing narrative for the final demo
MediChain demonstrates a full-stack, role-aware, evidence-seeking multi-agent clinical reasoning prototype that is technically real, inspectable, and operable end-to-end. Its value is not just in generating an answer, but in structuring the process, surfacing safety signals, preserving traceability, and giving both patient and provider workflows tangible interfaces.

The strongest claim to make is pragmatic: this is already a working foundation for safe-by-design, explainable medical AI interaction in educational and prototype settings, with clear paths to become more robust through testing, governance, and retrieval quality upgrades.
