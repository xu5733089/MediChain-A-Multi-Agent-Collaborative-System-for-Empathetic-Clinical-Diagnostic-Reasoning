# MediChain — Multi-Agent Collaborative System for Empathetic Clinical Diagnostic Reasoning

> **COMP9900 Capstone Project · Team 9900-W18C-CAKE · UNSW Sydney**
>
> ⚠️ **Educational Use Only** — This system is a research prototype and does not provide certified medical advice. Always consult a qualified healthcare professional.

---

## 📖 Project Overview / 项目简介

**English:**
MediChain is a multi-agent AI medical diagnostic system that simulates collaborative clinical reasoning through three specialized AI agents. It performs empathetic patient history-taking, evidence-grounded differential diagnosis using Retrieval-Augmented Generation (RAG) from real PubMed literature, and senior consultant-level safety review — all powered by Anthropic Claude.

**中文：**
MediChain 是一个多智能体 AI 医疗诊断系统，通过三个专业 AI 智能体模拟协作临床推理流程。系统基于真实 PubMed 文献的检索增强生成（RAG）技术，完成富有同理心的患者问诊、循证鉴别诊断以及高级顾问级安全审查，全程由 Anthropic Claude 驱动。

---

## 🤖 Agent Pipeline / 智能体流程

```
Patient Input
     ↓
🩺 Interviewer Agent      — SOCRATES-based empathetic history-taking
     ↓              ↘
🔬 Diagnostician Agent  ←  📚 RAG (ChromaDB + PubMed, 180+ articles)
     ↓
⚖️  Critic Agent          — Safety review, evidence quality check
     ↓
📄 Diagnostic Report      — PDF / JSON export
```

| Agent | Role | Color |
|-------|------|-------|
| 🩺 Interviewer | Empathetic SOCRATES-based history taking | Cyan |
| 🔬 Diagnostician | Differential diagnosis grounded in RAG literature | Purple |
| ⚖️ Critic | Safety flags, evidence gaps, final recommendation | Orange |

---

## ✨ Features / 功能特性

- **Multi-Agent Reasoning** — 3 specialized agents working sequentially
- **RAG Medical Literature** — 180+ PubMed articles indexed in ChromaDB
- **Reasoning Flow Visualization** — Interactive pipeline trace (PROJ-13)
- **MedQA Evaluation Dashboard** — Multi-Agent vs Single-LLM benchmark on USMLE-style questions (PROJ-14)
- **PDF / JSON Export** — Professional diagnostic report generation
- **SQLite Persistence** — Sessions survive backend restarts
- **Session History** — Browse and re-export all past sessions

---

## 🗂️ Project Structure / 项目结构

```
medichain/
├── medichain-frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── MediChain.jsx        # Main application (all pages)
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── medichain-backend/           # FastAPI Python backend
│   ├── main.py                  # API routes + SQLite session management
│   ├── agents.py                # Three AI agent functions
│   ├── rag.py                   # ChromaDB vector search
│   ├── ingest.py                # PubMed data ingestion
│   ├── export.py                # PDF report generation (ReportLab)
│   ├── eval.py                  # MedQA evaluation module
│   ├── requirements.txt
│   └── .env.example
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started / 快速开始

### Prerequisites / 环境要求

| Tool | Version | 说明 |
|------|---------|------|
| Python | 3.10+ | Backend |
| Node.js | 18+ | Frontend |
| Git | any | Version control |
| Anthropic API Key | — | [Get one here](https://console.anthropic.com/) |

---

### Backend Setup / 后端配置

```bash
# 1. Enter backend directory / 进入后端目录
cd medichain-backend

# 2. Create virtual environment / 创建虚拟环境
python -m venv venv

# 3. Activate virtual environment / 激活虚拟环境
# Windows:
.\venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# 4. Install dependencies / 安装依赖
pip install -r requirements.txt

# 5. Create .env file / 创建环境变量文件
# Copy .env.example to .env and fill in your API key
cp .env.example .env
# Edit .env and set: ANTHROPIC_API_KEY=sk-ant-...

# 6. Ingest PubMed literature into ChromaDB / 摄取 PubMed 文献
python ingest.py
# Expected output: "✅ Ingested 180 documents"

# 7. Start the backend server / 启动后端服务
uvicorn main:app --reload --port 8000
# Expected: "Application startup complete."
```

Verify at: `http://localhost:8000`
Expected response:
```json
{"service": "MediChain API", "version": "3.0.0", "rag_db_size": 180, "status": "ok"}
```

---

### Frontend Setup / 前端配置

Open a **new terminal window** / 打开**新的终端窗口**：

```bash
# 1. Enter frontend directory / 进入前端目录
cd medichain-frontend

# 2. Install dependencies / 安装依赖
npm install

# 3. Start development server / 启动开发服务器
npm run dev
```

Open in browser / 浏览器访问: `http://localhost:5173`

---

### Running Both Services / 同时运行两个服务

> ⚠️ You need **two terminal windows** running simultaneously.
> ⚠️ 需要同时保持**两个终端窗口**运行。

| Terminal | Command | URL |
|----------|---------|-----|
| Terminal 1 (Backend) | `uvicorn main:app --reload --port 8000` | `localhost:8000` |
| Terminal 2 (Frontend) | `npm run dev` | `localhost:5173` |

---

## 🖥️ Usage Guide / 使用指南

### Main Consultation / 主要诊断流程

1. Open `http://localhost:5173`
2. Fill in your symptoms, body area, duration and severity
3. Click **Begin AI Consultation**
4. Chat with the Interviewer Agent (2+ exchanges)
5. Diagnosis is automatically triggered — watch the Agent Reasoning Panel
6. View results across 4 tabs: Diagnosis / Critic Review / RAG Refs / Transcript
7. Export as **PDF** or **JSON**
8. Click **🔀 Flow View** to see the reasoning pipeline visualization

### MedQA Evaluation / 医学问答评估

1. Click **📊 MedQA Evaluation Dashboard** on the home page
2. Click **▶ Run** on any USMLE-style question
3. Compare Single LLM vs Multi-Agent accuracy
4. Click **▶ Run All Questions** for full benchmark
5. View category breakdown and history

---

## 🔌 API Endpoints / API 接口

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check + RAG DB size |
| GET | `/api/rag/status` | RAG database status |
| POST | `/api/session/start` | Start new diagnostic session |
| POST | `/api/session/chat` | Continue interview |
| POST | `/api/session/diagnose` | Trigger diagnosis + RAG |
| GET | `/api/session/{id}` | Get session data |
| GET | `/api/sessions` | List all sessions |
| GET | `/api/session/{id}/export/pdf` | Export PDF report |
| GET | `/api/session/{id}/export/json` | Export JSON data |
| GET | `/api/eval/questions` | Get MedQA questions |
| POST | `/api/eval/run` | Run evaluation |
| GET | `/api/eval/history` | Evaluation history + stats |

Full API docs: `http://localhost:8000/docs`

---

## 🛠️ Tech Stack / 技术栈

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 7 |
| Backend | FastAPI + Uvicorn |
| AI | Anthropic Claude (claude-sonnet-4-20250514) |
| RAG | ChromaDB + sentence-transformers (all-MiniLM-L6-v2) |
| Database | SQLite (sessions) |
| PDF Export | ReportLab |
| Literature | PubMed / NCBI Entrez API |

---

## 👥 Team / 团队

**Team 9900-W18C-CAKE · UNSW Sydney · COMP9900**

Client: Dr. Jianwei Wang

---

## ⚠️ Disclaimer / 免责声明

**English:** MediChain is developed for educational and research purposes as part of UNSW COMP9900. It is NOT a certified medical device and does NOT provide medical advice, diagnosis, or treatment. In case of medical emergency, call **000** (Australia) or your local emergency services immediately.

**中文：** MediChain 作为 UNSW COMP9900 课程项目开发，仅供教育和研究用途。本系统**不是**经过认证的医疗设备，**不提供**医疗建议、诊断或治疗方案。如遇医疗紧急情况，请立即拨打 **000**（澳大利亚）或当地急救电话。
