# Limitations and Future Work Notes

## 1. Project Limitations

### Limitation: The system is a research prototype, not a certified clinical tool

**What the limitation is:**  
MediChain can support educational clinical reasoning and demonstrations, but it is not validated or certified for real diagnosis, treatment decisions, or emergency triage.

**Evidence from the current project:**  
- `README.md` clearly states that the system is for educational/research use only and does not provide certified medical advice.
- `README.md` also includes an emergency warning in the disclaimer section.
- `safety.py` adds rule-based and LLM-based risk classification, but this is still a software safety layer, not a medically approved triage protocol.
- `agents.py` depends on Claude model outputs for interviewing, diagnosis, and critic review.

**Why this matters for the client or users:**  
Users may misunderstand an AI-generated diagnosis as medical advice. The client needs to present the project carefully as a prototype and make sure users know to consult qualified clinicians.

**Whether this was considered during planning/development:**  
Yes. The README disclaimer, safety classifier, and Critic Agent show that the team considered medical safety. However, formal clinical validation is not present.

### Limitation: AI output quality depends on external model behaviour and API availability

**What the limitation is:**  
The main clinical reasoning pipeline depends on external LLM calls. If the API key is missing, quota is exhausted, the provider is unavailable, or the model returns weak output, the system quality drops.

**Evidence from the current project:**  
- `agents.py` creates an Anthropic client using `ANTHROPIC_API_KEY`.
- `agents.py` uses `claude-sonnet-4-20250514` for interviewer, diagnostician, and critic calls.
- `safety.py` also uses Anthropic for the LLM safety layer, but falls back to low risk if the API key is missing or the call fails.
- `eval/evaluator.py` uses `MISTRAL_API_KEY` for judge/review functionality. Needs confirmation if this is required for the final client handover.
- `Retrospective_B.md` mentions an Anthropic quota blocker during development.

**Why this matters for the client or users:**  
The client cannot fully operate the system without valid API keys and enough model quota. Reliability, response speed, and answer quality are partly outside the local codebase.

**Whether this was considered during planning/development:**  
Partly. There are fallback paths for some failures, and the retrospective mentions the quota issue. More production-level handling and clearer client setup instructions are still needed.

### Limitation: Documentation is partly stale or inconsistent with the current implementation

**What the limitation is:**  
Some documentation still describes older architecture details, especially ChromaDB and smaller RAG size, while the current implementation uses Qdrant and a larger PubMed ingestion pipeline.

**Evidence from the current project:**  
- `README.md` describes RAG as `ChromaDB + PubMed, 180+ articles`.
- `README.md` project structure says `rag.py` is a ChromaDB vector search module.
- `README.md` setup step says `cp .env.example .env`, but no `medichain-backend/.env.example` file was found.
- `README.md` expected health response says version `3.0.0`, while `medichain-backend/main.py` creates `FastAPI(..., version="4.0.0")`.
- `medichain-backend/rag.py` clearly implements Qdrant hybrid search.
- `docker-compose.yml` includes a `qdrant` service.
- `medichain-backend/ingest.py` says it writes PubMed literature to Qdrant.
- `Retrospective_B.md` says there were zero automated tests, but the current repository has many backend tests under `medichain-backend/tests/` and `code_style_testing.md` reports `198 passed`.

**Why this matters for the client or users:**  
Stale documentation can make setup harder and may cause the client to misunderstand what has actually been delivered.

**Whether this was considered during planning/development:**  
Yes, but not fully resolved. `Retrospective_B.md` already notes that documentation lagged behind implementation, and `code_style_testing.md` still lists README quality documentation as unfinished.

### Limitation: Environment variable handover is incomplete

**What the limitation is:**  
The project needs environment variables for API keys, JWT security, and vector database settings, but there is no example environment file in the backend folder.

**Evidence from the current project:**  
- `README.md` tells users to run `cp .env.example .env`.
- No `.env.example` file was found in the project.
- `docker-compose.yml` uses `env_file: ./medichain-backend/.env`.
- `medichain-backend/.env` exists locally, but its contents should not be copied into the report or committed because it may contain secrets.
- `auth.py` uses `SECRET_KEY`, with a default value of `medichain-secret-key-change-in-production`.
- `agents.py` uses `ANTHROPIC_API_KEY`.
- `rag.py` can use `QDRANT_HOST` and `QDRANT_PORT`.

**Why this matters for the client or users:**  
Without a safe `.env.example`, the client may not know which keys are required. There is also a risk of accidentally sharing real secrets during handover.

**Whether this was considered during planning/development:**  
Partly. Environment setup is mentioned in `README.md` and `启动指南.md`, but the template file is missing and should be added before final delivery.

### Limitation: Deployment is available through Docker, but production hardening is limited

**What the limitation is:**  
The project has Docker files and compose setup, but the configuration is still closer to local/demo deployment than secure production deployment.

**Evidence from the current project:**  
- `docker-compose.yml` starts Qdrant, backend, and frontend.
- `medichain-backend/Dockerfile` builds a Python 3.11 backend and runs Uvicorn.
- `medichain-frontend/Dockerfile` builds React and serves it with Nginx.
- `medichain-frontend/nginx.conf` proxies `/api/` to the backend and disables buffering for SSE.
- `main.py` CORS origins are limited to local development origins: `localhost:5173`, `localhost:5174`, and `localhost:3000`.
- `auth.py` has a default JWT secret that says it must be changed in production.
- No `.github/workflows` directory was found, so there is no visible CI/CD pipeline.

**Why this matters for the client or users:**  
The client can run a demo, but extra work is needed before hosting it publicly or using real patient-like data.

**Whether this was considered during planning/development:**  
Partly. Docker support and Nginx proxying were implemented, but production security, CI/CD, and deployment documentation are still incomplete.

### Limitation: Data storage is simple and local

**What the limitation is:**  
The backend uses local SQLite and local upload storage. This is simple for a prototype but not ideal for multi-user production use, backup, scaling, or privacy controls.

**Evidence from the current project:**  
- `db.py` stores data in `medichain-backend/medichain.db`.
- `db.py` defines local SQLite tables for users, patients, sessions, messages, uploads, and eval runs.
- `main.py` stores uploaded files under `medichain-backend/uploads`.
- `docker-compose.yml` mounts `medichain-backend/medichain.db` and `medichain-backend/uploads` into the backend container.

**Why this matters for the client or users:**  
If the client wants real deployment, they will need backup, access control, encryption, retention policies, and possibly a managed database/object storage service.

**Whether this was considered during planning/development:**  
Yes for prototype persistence. The current design keeps data across restarts, but there is no evidence of production-grade data governance.

### Limitation: RAG ingestion and data freshness need more operational control

**What the limitation is:**  
The RAG knowledge base can be populated from PubMed, but keeping it fresh and consistent may require manual or slow ingestion work.

**Evidence from the current project:**  
- `ingest.py` has a default list of 78 medical search terms and fetches PubMed articles through NCBI Entrez.
- `main.py` supports `/api/rag/ingest` and optional `AUTO_INGEST=1` startup ingestion.
- `Retrospective_B.md` says RAG ingest was slow and blocking, and suggests incremental upsert as future work.
- `rag.py` uses Qdrant, dense embeddings, BM25 sparse vectors, and a reranker, which adds quality but also setup and runtime cost.

**Why this matters for the client or users:**  
The usefulness of evidence-grounded diagnosis depends on the quality and freshness of the indexed literature. Slow or manual updates can limit maintainability.

**Whether this was considered during planning/development:**  
Yes. Provider-triggered ingestion and Qdrant storage were implemented, and the retrospective identifies incremental ingestion as a future improvement.

### Limitation: Multimodal support is strong but not equally mature across all workflows

**What the limitation is:**  
The project supports many file types, but not every file type is equally reliable in every route or user flow.

**Evidence from the current project:**  
- `main.py` allows PDF, TXT, images, DICOM, audio, and video extensions.
- `main.py` has helpers for image analysis, DICOM conversion, audio transcription, and video frame analysis.
- `final_demo.md` notes that stateless analysis supports image, DICOM, audio, video, PDF, and TXT, while session upload is most reliable for image/PDF/TXT in the consultation flow.
- `db.py` upload table currently allows file types `pdf`, `txt`, `image`, `audio`, and `video`; DICOM is handled as an analysis type in `main.py`, but persistence details need confirmation.

**Why this matters for the client or users:**  
Users may expect all media types to work the same way inside the consultation. If audio/video/DICOM are less mature in session context, this should be explained during handover.

**Whether this was considered during planning/development:**  
Yes. The implementation includes fallback messages when optional dependencies or processing fail, and `final_demo.md` already records the difference between route capabilities.

### Limitation: Frontend testing and end-to-end regression coverage are still missing

**What the limitation is:**  
Backend testing has improved a lot, but there is no visible frontend test framework or end-to-end browser test suite.

**Evidence from the current project:**  
- `medichain-frontend/package.json` has scripts for `dev`, `build`, `lint`, and `preview`, but no `test` or `format:check` script.
- `code_style_testing.md` lists frontend testing with Vitest/Jest + React Testing Library as unfinished.
- `code_style_testing.md` also lists regression testing as unfinished.
- No CI workflow was found under `.github/workflows`.

**Why this matters for the client or users:**  
The UI is a major part of the client experience. Without automated frontend/E2E tests, regressions in login, chat, upload, provider dashboard, and export flows may only be found manually.

**Whether this was considered during planning/development:**  
Yes. `code_style_testing.md` explicitly tracks frontend testing and regression testing as pending work.

### Limitation: Some quality gates are documented as pending

**What the limitation is:**  
The project has evidence of backend quality work, but some quality gate tasks are still incomplete.

**Evidence from the current project:**  
- `code_style_testing.md` says backend pytest status is `198 passed` and total coverage is `94%`.
- The same file still marks README quality gate documentation, frontend `format:check`, some `db.py` CRUD tests, JSON export structure tests, frontend tests, and regression tests as incomplete.
- `medichain-backend/pytest.ini` configures pytest discovery.
- `medichain-backend/tests/` contains many route and unit tests.

**Why this matters for the client or users:**  
The client can see that testing has been taken seriously, but the remaining gaps should be disclosed so maintenance priorities are clear.

**Whether this was considered during planning/development:**  
Yes. The testing checklist is detailed and appears to be actively tracking progress.

### Limitation: Handover communication evidence is not visible in the repository

**What the limitation is:**  
The repository contains setup and demo documents, but it does not show evidence that final files and instructions have already been sent to the client.

**Evidence from the current project:**  
- `README.md`, `启动指南.md`, `final_demo.md`, and `code_style_testing.md` are useful handover artefacts.
- No obvious client email/message screenshot, handover confirmation, or signed-off delivery note was found in the repository.
- Needs confirmation: the team may have communicated with the client outside Git, but the evidence is not stored here.

**Why this matters for the client or users:**  
The assignment likely needs proof that the client received the project, setup instructions, known limitations, and a chance to provide feedback.

**Whether this was considered during planning/development:**  
Needs confirmation. The repository prepares technical material, but handover communication evidence still appears pending.

## 2. Handover Preparation Completed So Far

### Artefact: Main README

**Location/path:** `README.md`

**What it explains:**  
Project overview, agent pipeline, main features, project structure, backend/frontend setup, usage guide, API endpoint list, tech stack, team/client details, and medical disclaimer.

**How it helps the client continue using or maintaining the project:**  
It gives the client a central entry point for understanding what MediChain does and how to run the backend and frontend. It also lists the main API endpoints and user flows.

**Note:** Some parts need updating because they still mention ChromaDB, `.env.example`, version `3.0.0`, and 180 documents.

### Artefact: Chinese Startup Guide

**Location/path:** `../启动指南.md` relative to the repository folder, or `/Users/zhangyaowen/Desktop/medi-chain/启动指南.md` in the current workspace.

**What it explains:**  
Local backend setup with Python virtual environment, dependency installation, `.env` check, Uvicorn command, frontend install, and `VITE_BACKEND_URL=http://localhost:8000 npm run dev`.

**How it helps the client continue using or maintaining the project:**  
It provides a short practical runbook for starting the project locally. It is useful for a Chinese-speaking maintainer or team member.

### Artefact: Docker Compose Deployment Config

**Location/path:** `docker-compose.yml`

**What it explains:**  
How to run Qdrant, backend, and frontend together using containers. It shows ports, backend environment file usage, Qdrant host/port wiring, and mounted persistent files.

**How it helps the client continue using or maintaining the project:**  
It gives a repeatable way to launch the full stack without manually starting each service. It is also a base for future cloud deployment.

### Artefact: Backend Dockerfile

**Location/path:** `medichain-backend/Dockerfile`

**What it explains:**  
How the Python backend image is built, including system dependencies such as ffmpeg and flac, backend Python dependencies, and the Uvicorn startup command.

**How it helps the client continue using or maintaining the project:**  
It documents the backend runtime environment and makes backend deployment more reproducible.

### Artefact: Frontend Dockerfile and Nginx Config

**Location/path:** `medichain-frontend/Dockerfile`, `medichain-frontend/nginx.conf`

**What it explains:**  
How the React app is built and served with Nginx. The Nginx config also proxies `/api/` to the backend and disables buffering for streaming/SSE responses.

**How it helps the client continue using or maintaining the project:**  
It supports packaged frontend deployment and explains how the frontend connects to the backend in Docker mode.

### Artefact: Backend Requirements

**Location/path:** `medichain-backend/requirements.txt`

**What it explains:**  
Python dependencies for the backend, including FastAPI, Uvicorn, Anthropic SDK, Qdrant client, sentence-transformers, ReportLab, auth libraries, multimedia processing libraries, pytest, and pytest-cov.

**How it helps the client continue using or maintaining the project:**  
It lets a maintainer recreate the Python environment and understand major backend technology dependencies.

### Artefact: Frontend Package Config

**Location/path:** `medichain-frontend/package.json`

**What it explains:**  
Frontend dependencies and scripts for development, Docker/dev modes, build, lint, and preview.

**How it helps the client continue using or maintaining the project:**  
It tells the maintainer how to install and run the React frontend and which tools are used.

### Artefact: FastAPI Interactive API Documentation

**Location/path:** Generated at runtime from `medichain-backend/main.py`; available at `http://localhost:8000/docs` when the backend is running.

**What it explains:**  
Interactive API documentation for routes such as auth, session start/chat/diagnose, uploads, exports, patient/provider routes, RAG status/ingestion, evaluation, OCR, and comparison.

**How it helps the client continue using or maintaining the project:**  
It lets the client or maintainer inspect and test backend endpoints without reading all backend code.

### Artefact: Final Demo Draft

**Location/path:** `final_demo.md`

**What it explains:**  
Evidence-based demo narrative, implemented features, user roles, patient/provider flows, backend/frontend architecture, data storage, AI workflow, safety mechanisms, edge cases, limitations, and future improvements.

**How it helps the client continue using or maintaining the project:**  
It is useful for explaining the system to stakeholders and for checking which features are demo-safe.

### Artefact: Code Style and Testing Checklist

**Location/path:** `code_style_testing.md`

**What it explains:**  
Testing and quality tasks, completed backend tests, pytest/coverage evidence, pending frontend tests, pending quality gate documentation, and current status.

**How it helps the client continue using or maintaining the project:**  
It shows what quality work has been done and what needs further work. This is useful for maintenance planning.

### Artefact: Backend Test Suite

**Location/path:** `medichain-backend/tests/`

**What it explains:**  
Automated tests for backend routes and modules, including auth, sessions, uploads, patient/provider routes, RAG, agents, safety, export, evaluation, streaming, media analysis, OCR/compare, and delete routes.

**How it helps the client continue using or maintaining the project:**  
It gives maintainers a way to check that backend changes do not break important behaviours.

### Artefact: Pytest Config

**Location/path:** `medichain-backend/pytest.ini`

**What it explains:**  
Pytest discovery configuration using `tests` and `test_*.py`, with quiet output by default.

**How it helps the client continue using or maintaining the project:**  
It makes backend test execution more consistent.

### Artefact: RAG Ingestion Script

**Location/path:** `medichain-backend/ingest.py`

**What it explains:**  
How PubMed literature is fetched and ingested into Qdrant. It includes default clinical search terms and CLI usage examples.

**How it helps the client continue using or maintaining the project:**  
It gives the client a way to rebuild or update the medical literature knowledge base.

### Artefact: Database Schema Code

**Location/path:** `medichain-backend/db.py`

**What it explains:**  
SQLite database schema for users, patients, sessions, messages, uploads, and evaluation runs, plus lightweight migrations.

**How it helps the client continue using or maintaining the project:**  
It helps maintainers understand stored data and how the backend persists consultation history.

### Artefact: Central Frontend API Client

**Location/path:** `medichain-frontend/src/core/api.js`

**What it explains:**  
Frontend backend URL selection, JSON/form requests, SSE stream parsing, and wrapper functions for the main backend endpoints.

**How it helps the client continue using or maintaining the project:**  
It gives maintainers one main place to update frontend/backend communication.

### Artefact: Git Commit History

**Location/path:** Git history in the repository.

**What it explains:**  
Recent commits include UI improvements, streaming language changes, evaluation framework scaffolding, and presentation/demo updates.

**How it helps the client continue using or maintaining the project:**  
It provides some history of recent work. However, the retrospective says commit discipline was inconsistent, so this should not be the only handover record.

## 3. Handover Communication Still Needed

### Suggested email/message template to send to the client

Subject: MediChain Project Handover - Repository, Setup Instructions, Limitations, and Next Steps

Dear Dr. Wang,

We are sharing the MediChain project handover materials for the current version of the system.

The delivered files include the project repository with the React frontend, FastAPI backend, Docker/Docker Compose configuration, RAG ingestion code, database schema, automated backend tests, and supporting documentation. The main setup and run instructions are in `README.md`, with an additional local startup guide in `启动指南.md`.

The main completed features include:
- Patient and provider authentication flows
- Patient consultation intake and AI interview workflow
- Multi-agent diagnostic reasoning with Interviewer, Diagnostician, and Critic agents
- RAG-based medical literature retrieval using Qdrant
- Multimodal file analysis support
- Session history, provider dashboard, and PDF/JSON export
- Backend automated test coverage for many API routes and modules

Known limitations include:
- The system is an educational/research prototype and is not a certified medical device.
- It depends on external AI APIs and valid API keys.
- Some documentation still needs updating to fully match the current Qdrant-based implementation.
- Production deployment would require stronger secrets management, database/storage planning, security review, and privacy controls.
- Frontend and end-to-end automated tests are still limited.

Suggested future work includes updating the documentation and `.env.example`, improving production deployment security, expanding frontend/E2E testing, improving incremental RAG ingestion, strengthening clinical validation with expert review, and improving provider feedback workflows.

Please let us know if you can access the delivered files and whether the setup instructions are clear. We would also appreciate any feedback or confirmation that the handover materials are sufficient for your review and future use.

Kind regards,  
Team 9900-W18C-CAKE

### Key topics that should be included in the handover message

- Link or delivery method for the project repository/files.
- Which branch or folder should be treated as the final submitted version.
- How to run the backend locally.
- How to run the frontend locally.
- How to run with Docker Compose.
- Required environment variables, without exposing real API keys.
- How to check FastAPI docs at `http://localhost:8000/docs`.
- Main completed features.
- Known limitations and safety disclaimer.
- What tests exist and how to run backend pytest.
- What is still pending or needs future maintenance.
- Request for client feedback or confirmation.

### Checklist of screenshots/evidence to capture for the report

- Screenshot of the handover email/message sent to the client.
- Screenshot or export showing the client acknowledged the handover. Needs confirmation.
- Screenshot of the repository/file delivery location, with final branch or zip file visible.
- Screenshot of `README.md` setup instructions.
- Screenshot of `启动指南.md` local run instructions, if used.
- Screenshot of backend running and health check response from `http://localhost:8000`.
- Screenshot of FastAPI docs at `http://localhost:8000/docs`.
- Screenshot of frontend running in browser.
- Screenshot of patient login/registration flow.
- Screenshot of consultation chat flow.
- Screenshot of diagnosis/results page.
- Screenshot of provider dashboard.
- Screenshot of PDF or JSON export feature.
- Screenshot of Docker Compose config or terminal running the services, if used.
- Screenshot of backend tests passing, such as `pytest` or the current `code_style_testing.md` status.
- Screenshot of known limitations/future work notes being shared or referenced in handover.

### Pending handover explanation

Handover does not appear fully complete from repository evidence alone. The project has useful technical handover materials, but there is no visible proof that the client has received the final repository, setup instructions, known limitations, and future work list. It is also pending to confirm whether the client has acknowledged the handover and whether real API keys or deployment credentials will be provided separately and securely.

Needs confirmation: client communication may already have happened outside the repository, but no evidence was found in the project files.

## 4. Future Work Suggestions

### Future work: Update and clean handover documentation

**What should be improved or added:**  
Update `README.md` to match the current Qdrant implementation, backend version, real setup steps, current RAG size expectations, and current testing status. Add a safe `medichain-backend/.env.example`.

**Why it would be useful for the client/users:**  
It would reduce setup confusion and make the delivered project easier to maintain.

**Resources required:**  
Developer time, documentation review, and confirmation of required environment variables.

**Estimated difficulty:** Low

**Short-term or long-term:** Short-term

### Future work: Add a complete environment variable template and secrets guide

**What should be improved or added:**  
Create `.env.example` with placeholders for `ANTHROPIC_API_KEY`, `SECRET_KEY`, `QDRANT_HOST`, `QDRANT_PORT`, and optional evaluation keys such as `MISTRAL_API_KEY`. Add notes about not committing real secrets.

**Why it would be useful for the client/users:**  
It would make setup safer and clearer for the client.

**Resources required:**  
Developer time and security review of all used environment variables.

**Estimated difficulty:** Low

**Short-term or long-term:** Short-term

### Future work: Improve production deployment readiness

**What should be improved or added:**  
Add production deployment documentation, stronger CORS configuration, real `SECRET_KEY` rotation guidance, health checks, logging, HTTPS reverse proxy notes, and environment-specific settings.

**Why it would be useful for the client/users:**  
It would help the client move beyond local demo usage toward a safer hosted version.

**Resources required:**  
Developer time, cloud server or hosting environment, DevOps support, security review.

**Estimated difficulty:** Medium

**Short-term or long-term:** Long-term

### Future work: Replace local SQLite/uploads with production-grade storage

**What should be improved or added:**  
Move from local SQLite and local upload folders to a managed database and object storage, with backup, retention, and access control policies.

**Why it would be useful for the client/users:**  
It would improve reliability, scaling, and data management if more users or sensitive data are involved.

**Resources required:**  
Backend developer time, cloud database/storage, migration planning, privacy/security review.

**Estimated difficulty:** High

**Short-term or long-term:** Long-term

### Future work: Add frontend and end-to-end testing

**What should be improved or added:**  
Add Vitest or Jest with React Testing Library for components, plus Playwright/Cypress tests for patient login, consultation, upload, results export, and provider dashboard flows.

**Why it would be useful for the client/users:**  
It would reduce the chance of UI regressions and make future maintenance safer.

**Resources required:**  
Frontend developer time, test framework setup, browser automation, sample test data.

**Estimated difficulty:** Medium

**Short-term or long-term:** Short-term

### Future work: Add CI quality gates

**What should be improved or added:**  
Add GitHub Actions or similar CI to run backend tests, frontend lint, frontend build, and possibly coverage checks on every pull request.

**Why it would be useful for the client/users:**  
It would make the project easier to maintain and reduce the chance of broken code being delivered.

**Resources required:**  
Developer time, GitHub repository access, CI configuration.

**Estimated difficulty:** Medium

**Short-term or long-term:** Short-term

### Future work: Improve incremental RAG ingestion and monitoring

**What should be improved or added:**  
Make PubMed ingestion incremental, skip existing documents reliably, show progress, log failures, and support scheduled updates.

**Why it would be useful for the client/users:**  
It would keep the knowledge base fresher without requiring long manual re-ingestion.

**Resources required:**  
Backend developer time, Qdrant knowledge, PubMed/NCBI API review, testing.

**Estimated difficulty:** Medium

**Short-term or long-term:** Medium-term

### Future work: Improve RAG evidence quality and clinical validation

**What should be improved or added:**  
Add expert-reviewed source selection, better citation reliability scoring, domain-specific corpora, and possibly clinical evaluation against approved cases.

**Why it would be useful for the client/users:**  
It would make the evidence-grounded diagnosis more trustworthy and easier to explain.

**Resources required:**  
Clinical/domain expert input, additional datasets, backend/RAG developer time, evaluation design.

**Estimated difficulty:** High

**Short-term or long-term:** Long-term

### Future work: Strengthen safety and privacy governance

**What should be improved or added:**  
Add clearer emergency escalation messaging, stronger audit logs, privacy policy notes, data retention controls, and review of uploaded file handling. Consider encryption at rest for sensitive data.

**Why it would be useful for the client/users:**  
Medical-style applications need strong trust, privacy, and safety boundaries, even if they are prototypes.

**Resources required:**  
Security review, clinical/domain expert input, backend developer time, legal/privacy guidance if used outside class.

**Estimated difficulty:** High

**Short-term or long-term:** Long-term

### Future work: Make multimodal session upload support more consistent

**What should be improved or added:**  
Bring the in-session upload pathway to the same maturity as the stateless file analysis endpoint, especially for audio, video, and DICOM. Confirm DICOM persistence and display behaviour.

**Why it would be useful for the client/users:**  
Users would have a clearer and more predictable experience when uploading medical media during consultation.

**Resources required:**  
Backend developer time, frontend UI updates, test files, clinical/media processing review.

**Estimated difficulty:** Medium

**Short-term or long-term:** Medium-term

### Future work: Add provider feedback and human review loops

**What should be improved or added:**  
Let providers annotate diagnoses, mark helpful/unhelpful results, request changes, or store feedback for future evaluation.

**Why it would be useful for the client/users:**  
It would make the system more useful as a clinical reasoning assistant and create data for improving the AI workflow.

**Resources required:**  
Backend and frontend developer time, database changes, UI/UX design, clinical expert input.

**Estimated difficulty:** Medium

**Short-term or long-term:** Long-term

### Future work: Improve user-facing error handling

**What should be improved or added:**  
Add clearer frontend toast messages or inline errors for API failures, quota issues, upload problems, and model timeouts.

**Why it would be useful for the client/users:**  
Users would understand whether they need to retry, wait, change input, or contact support.

**Resources required:**  
Frontend developer time, backend error response review, manual testing.

**Estimated difficulty:** Low

**Short-term or long-term:** Short-term

### Future work: Prepare a formal client handover pack

**What should be improved or added:**  
Create a final handover pack with repository link, setup guide, screenshots, test evidence, known limitations, future work, and client acknowledgement.

**Why it would be useful for the client/users:**  
It would satisfy handover evidence needs and make the final delivery easier for the client to review.

**Resources required:**  
Team coordination, documentation time, screenshots, client communication.

**Estimated difficulty:** Low

**Short-term or long-term:** Short-term

## 5. Report-Ready Summary Points

### Key limitations

- MediChain is an educational/research prototype and is not a certified medical device.
- The system depends on external AI services, especially Anthropic Claude, so API keys, quota, and model behaviour affect reliability.
- Documentation is partly stale: `README.md` still mentions ChromaDB and `.env.example`, while the current code uses Qdrant and no `.env.example` file was found.
- Production readiness is limited: Docker exists, but secrets management, CORS, HTTPS, CI/CD, monitoring, and deployment guidance need more work.
- Data storage is local SQLite plus local upload folders, which is suitable for a prototype but not ideal for real multi-user or sensitive-data deployment.
- RAG ingestion exists but needs better incremental update and monitoring.
- Multimodal support is implemented, but some media types are more mature in stateless analysis than in the full consultation workflow.
- Backend testing is strong, but frontend/E2E testing and regression testing are still incomplete.

### Handover status

- Main handover materials already exist: `README.md`, `启动指南.md`, `final_demo.md`, `docker-compose.yml`, Dockerfiles, backend tests, `code_style_testing.md`, and FastAPI `/docs`.
- The repository includes setup instructions, API endpoint information, usage guide, Docker setup, database schema, RAG ingestion code, and testing evidence.
- The backend test suite is well developed, and `code_style_testing.md` records `198 passed` and `94%` total backend coverage.

### Pending handover evidence

- Needs confirmation that the client has received the final repository or files.
- Needs screenshot/evidence of the handover email/message.
- Needs screenshot/evidence of client acknowledgement or feedback.
- Needs final confirmation of setup instructions after updating stale documentation.
- Needs a safe `.env.example` instead of relying on the local `.env`.
- Needs evidence screenshots for backend health check, FastAPI docs, frontend running, main user flows, provider dashboard, export, and tests passing.

### Recommended future work

- Update `README.md` and add `medichain-backend/.env.example`.
- Add frontend unit tests and end-to-end tests for the main patient/provider workflows.
- Add CI quality gates for backend tests, frontend lint, and frontend build.
- Improve production deployment security, secrets management, logging, and health checks.
- Move storage from local SQLite/uploads to production-ready database and object storage if the project will be hosted.
- Improve incremental RAG ingestion and evidence quality validation.
- Strengthen privacy, safety governance, and clinical expert review before any real-world use.
- Make multimodal session uploads more consistent across image, PDF, TXT, DICOM, audio, and video.
- Prepare and capture formal client handover communication evidence.
