"""
eval/evaluator.py — PROJ-14 MedQA evaluation module
Compares Multi-Agent vs Single-LLM on USMLE-style questions.
Mistral as independent judge evaluating Claude multi-agent diagnosis.

Backend priority:
  1. ANTHROPIC_API_KEY  → Anthropic SDK (claude-sonnet-4-20250514)
  2. OPENROUTER_API_KEY → OpenRouter httpx (anthropic/claude-3.5-sonnet)
"""
import os
import httpx

# ── API configuration ──────────────────────────────────────────────────────────
_ANT_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
_OR_KEY  = (
    os.environ.get("OPENROUTER_API_KEY")
    or os.environ.get("MISTRAL_API_KEY", "")
)
_OR_BASE = "https://openrouter.ai/api/v1/chat/completions"

_ANT_MODEL    = "claude-sonnet-4-20250514"
_OR_CLAUDE    = "anthropic/claude-sonnet-4.5"     # OpenRouter model slug
_OR_MISTRAL   = "mistralai/mistral-large"        # OpenRouter model slug for judge

# Lazy-init Anthropic client only when the key is present
_ant_client = None
if _ANT_KEY:
    import anthropic as _anthropic
    _ant_client = _anthropic.Anthropic(api_key=_ANT_KEY)


# ── low-level LLM call (Anthropic SDK or OpenRouter) ──────────────────────────

def _llm_call(system: str, user: str, max_tokens: int = 300) -> str:
    """Call Claude via Anthropic SDK (preferred) or OpenRouter (fallback)."""
    if _ant_client:
        resp = _ant_client.messages.create(
            model=_ANT_MODEL, max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return resp.content[0].text

    # OpenRouter path (no Anthropic key available)
    if not _OR_KEY:
        raise RuntimeError(
            "No LLM credentials found. "
            "Set ANTHROPIC_API_KEY or OPENROUTER_API_KEY in .env"
        )
    resp = httpx.post(
        _OR_BASE,
        headers={
            "Authorization": f"Bearer {_OR_KEY}",
            "Content-Type":  "application/json",
            "HTTP-Referer":  "https://medichain.app",
            "X-Title":       "MediChain Eval",
        },
        json={
            "model":    _OR_CLAUDE,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            "max_tokens":  max_tokens,
            "temperature": 0.1,
        },
        timeout=60.0,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


# ── prompt templates ───────────────────────────────────────────────────────────

MISTRAL_REVIEW_PROMPT = """You are an independent senior physician AI providing a second opinion on a clinical diagnosis made by another AI system.

You will receive:
- The patient's chief complaint and symptoms
- The differential diagnoses produced by a multi-agent Claude AI pipeline (Diagnostician + Critic)

Your task is to independently assess the quality and safety of the diagnosis. Be concise and clinically rigorous.

Respond in EXACTLY this format:
VERDICT: [PLAUSIBLE / NEEDS_REVIEW / CONCERNING]
CONFIDENCE: [HIGH / MEDIUM / LOW]
MISSED_DIAGNOSES: [comma-separated list of any important missed differentials, or "None"]
SAFETY_FLAGS: [any red flags or urgent safety concerns, or "None"]
ASSESSMENT: [2-3 sentences: overall quality, key strengths, key gaps]"""

MISTRAL_JUDGE_PROMPT = """You are an independent medical AI judge evaluating another AI system's diagnostic answer.
You will receive a USMLE-style clinical question, the answer choices, the correct answer, and the answer given by a multi-agent Claude pipeline.

Your job is to:
1. Determine whether the Claude pipeline's answer is correct (matches the correct answer)
2. Assess the quality of its reasoning, even if the final letter is wrong
3. Give a concise verdict

Respond in EXACTLY this format:
VERDICT: [CORRECT / INCORRECT]
CONFIDENCE: [HIGH / MEDIUM / LOW]
ASSESSMENT: [2-3 sentences evaluating the reasoning quality and clinical accuracy]"""

SINGLE_LLM_PROMPT = """You are a medical AI assistant. Answer the following USMLE-style question.
Provide ONLY:
1. Your answer choice (A/B/C/D/E)
2. A brief one-sentence explanation

Format:
ANSWER: [letter]
REASONING: [one sentence]"""

MULTI_AGENT_SYSTEM = """You are part of a multi-agent medical reasoning system.
You will receive a USMLE-style question that has already been analyzed by:
- An Interviewer Agent (clarified key clinical features)
- A Diagnostician Agent (generated differential diagnoses)

Your role as the Critic Agent is to:
1. Review the reasoning
2. Select the best answer
3. Provide structured justification

Format your response as:
ANSWER: [letter]
CONFIDENCE: [HIGH/MEDIUM/LOW]
REASONING: [2-3 sentence clinical justification]
AGENT_NOTES: [what the multi-agent pipeline added vs single LLM]"""


# ── evaluation functions ───────────────────────────────────────────────────────

def run_single_llm(question: str, options: dict) -> dict:
    """Single-LLM baseline."""
    opts_text = "\n".join(f"{k}. {v}" for k, v in options.items())
    text = _llm_call(
        system=SINGLE_LLM_PROMPT,
        user=f"Question:\n{question}\n\nOptions:\n{opts_text}",
        max_tokens=300,
    )
    answer, reasoning = _parse_answer(text)
    return {"answer": answer, "reasoning": reasoning, "raw": text}


def run_multi_agent(question: str, options: dict) -> dict:
    """Three-agent pipeline: Interviewer → Diagnostician → Critic."""
    opts_text = "\n".join(f"{k}. {v}" for k, v in options.items())

    # Step 1: Interviewer — extract key clinical features
    interviewer_output = _llm_call(
        system="""You are the Interviewer Agent in a medical reasoning pipeline.
Extract and list the key clinical features from this USMLE question that are most relevant for diagnosis.
Be concise — list 4-6 bullet points.""",
        user=f"Question:\n{question}\n\nOptions:\n{opts_text}",
        max_tokens=300,
    )

    # Step 2: Diagnostician — analyze differential diagnoses
    diagnostician_output = _llm_call(
        system="""You are the Diagnostician Agent. Based on the clinical features provided,
analyze the differential diagnoses and identify the most likely answer.
Consider each option systematically.""",
        user=(
            f"Clinical features identified:\n{interviewer_output}\n\n"
            f"Original question:\n{question}\n\nOptions:\n{opts_text}"
        ),
        max_tokens=400,
    )

    # Step 3: Critic — final review and answer
    critic_output = _llm_call(
        system=MULTI_AGENT_SYSTEM,
        user=(
            f"Interviewer Analysis:\n{interviewer_output}\n\n"
            f"Diagnostician Analysis:\n{diagnostician_output}\n\n"
            f"Original question:\n{question}\n\nOptions:\n{opts_text}"
        ),
        max_tokens=400,
    )
    answer, reasoning = _parse_answer(critic_output)

    return {
        "answer": answer,
        "reasoning": reasoning,
        "raw": critic_output,
        "pipeline": {
            "interviewer":   interviewer_output,
            "diagnostician": diagnostician_output,
            "critic":        critic_output,
        },
    }


def run_mistral_diagnosis_review(
    symptoms_text: str, diagnosis_text: str, review_text: str = ""
) -> dict:
    """
    Mistral Large via OpenRouter — independent second opinion on Claude's
    multi-agent clinical diagnosis. Returns structured assessment dict.
    """
    if not _OR_KEY:
        return {
            "verdict": "UNAVAILABLE", "confidence": "N/A",
            "missed_diagnoses": "", "safety_flags": "",
            "assessment": "OpenRouter API key not configured.",
        }

    user_msg = (
        f"Patient symptoms / chief complaint:\n{symptoms_text}\n\n"
        f"Claude multi-agent differential diagnosis:\n{diagnosis_text}"
        + (f"\n\nCritic review:\n{review_text}" if review_text else "")
    )
    try:
        resp = httpx.post(
            _OR_BASE,
            headers={
                "Authorization": f"Bearer {_OR_KEY}",
                "Content-Type":  "application/json",
                "HTTP-Referer":  "https://medichain.app",
                "X-Title":       "MediChain PeerReview",
            },
            json={
                "model":    _OR_MISTRAL,
                "messages": [
                    {"role": "system", "content": MISTRAL_REVIEW_PROMPT},
                    {"role": "user",   "content": user_msg},
                ],
                "max_tokens":  400,
                "temperature": 0.15,
            },
            timeout=30.0,
        )
        resp.raise_for_status()
        text = resp.json()["choices"][0]["message"]["content"]
        out = {
            "verdict": "PLAUSIBLE", "confidence": "MEDIUM",
            "missed_diagnoses": "None", "safety_flags": "None",
            "assessment": text,
        }
        for line in text.split("\n"):
            line = line.strip()
            for key in ("VERDICT", "CONFIDENCE", "MISSED_DIAGNOSES", "SAFETY_FLAGS", "ASSESSMENT"):
                if line.upper().startswith(f"{key}:"):
                    out[key.lower()] = line.split(":", 1)[1].strip()
                    break
        return out
    except Exception as e:
        return {
            "verdict": "ERROR", "confidence": "N/A",
            "missed_diagnoses": "", "safety_flags": "",
            "assessment": str(e),
        }


def run_mistral_judge(
    question: str, options: dict,
    claude_answer: str, claude_reasoning: str,
    correct_answer: str,
) -> dict:
    """
    Mistral Large via OpenRouter as independent judge.
    Returns {"verdict": "CORRECT"|"INCORRECT", "confidence", "assessment", "correct": bool}
    """
    if not _OR_KEY:
        return {
            "verdict": "UNAVAILABLE", "confidence": "N/A",
            "assessment": "OPENROUTER_API_KEY / MISTRAL_API_KEY not configured.",
            "correct": None,
        }

    opts_text = "\n".join(f"{k}. {v}" for k, v in options.items())
    user_msg = (
        f"Question:\n{question}\n\n"
        f"Options:\n{opts_text}\n\n"
        f"Correct answer: {correct_answer}\n\n"
        f"Claude multi-agent answer: {claude_answer}\n"
        f"Claude reasoning: {claude_reasoning}"
    )
    try:
        resp = httpx.post(
            _OR_BASE,
            headers={
                "Authorization": f"Bearer {_OR_KEY}",
                "Content-Type":  "application/json",
                "HTTP-Referer":  "https://medichain.app",
                "X-Title":       "MediChain Eval",
            },
            json={
                "model":    _OR_MISTRAL,
                "messages": [
                    {"role": "system", "content": MISTRAL_JUDGE_PROMPT},
                    {"role": "user",   "content": user_msg},
                ],
                "max_tokens":  300,
                "temperature": 0.1,
            },
            timeout=30.0,
        )
        resp.raise_for_status()
        text = resp.json()["choices"][0]["message"]["content"]
        verdict, confidence, assessment = "INCORRECT", "LOW", text
        for line in text.split("\n"):
            line = line.strip()
            if line.upper().startswith("VERDICT:"):
                v = line.split(":", 1)[1].strip().upper()
                verdict = "CORRECT" if "CORRECT" in v else "INCORRECT"
            elif line.upper().startswith("CONFIDENCE:"):
                confidence = line.split(":", 1)[1].strip().upper()
            elif line.upper().startswith("ASSESSMENT:"):
                assessment = line.split(":", 1)[1].strip()
        return {
            "verdict": verdict, "confidence": confidence,
            "assessment": assessment, "correct": verdict == "CORRECT",
        }
    except Exception as e:
        return {
            "verdict": "ERROR", "confidence": "N/A",
            "assessment": str(e), "correct": None,
        }


# ── helpers ────────────────────────────────────────────────────────────────────

def _parse_answer(text: str) -> tuple:
    """Parse answer letter and reasoning from LLM output."""
    answer   = "?"
    reasoning = text[:200]

    for line in text.split("\n"):
        line = line.strip()
        if line.upper().startswith("ANSWER:"):
            parts = line.split(":", 1)
            if len(parts) > 1:
                ans = parts[1].strip().upper()
                for c in ans:
                    if c in "ABCDE":
                        answer = c
                        break
        elif line.upper().startswith("REASONING:"):
            parts = line.split(":", 1)
            if len(parts) > 1:
                reasoning = parts[1].strip()

    return answer, reasoning


# ── built-in USMLE question bank (5 classic questions) ────────────────────────

SAMPLE_QUESTIONS = [
    {
        "id": "q1",
        "question": "A 65-year-old man presents with sudden onset of severe chest pain radiating to his left arm and jaw, diaphoresis, and nausea. His ECG shows ST-elevation in leads II, III, and aVF. Which coronary artery is most likely occluded?",
        "options": {"A":"Left anterior descending artery","B":"Right coronary artery","C":"Left circumflex artery","D":"Left main coronary artery","E":"Posterior descending artery"},
        "correct": "B",
        "category": "Cardiology",
    },
    {
        "id": "q2",
        "question": "A 28-year-old woman presents with progressive muscle weakness that worsens with repeated use and improves with rest. Edrophonium (Tensilon) test is positive. Which mechanism best explains this condition?",
        "options": {"A":"Autoimmune destruction of acetylcholine","B":"Autoantibodies against acetylcholine receptors at the neuromuscular junction","C":"Deficiency of acetylcholinesterase","D":"Presynaptic calcium channel antibodies","E":"Demyelination of motor neurons"},
        "correct": "B",
        "category": "Neurology",
    },
    {
        "id": "q3",
        "question": "A 45-year-old woman presents with fatigue, weight gain, cold intolerance, constipation, and dry skin. Labs show TSH of 12 mIU/L and low free T4. What is the most appropriate initial treatment?",
        "options": {"A":"Methimazole","B":"Radioactive iodine","C":"Levothyroxine","D":"Propylthiouracil","E":"Thyroidectomy"},
        "correct": "C",
        "category": "Endocrinology",
    },
    {
        "id": "q4",
        "question": "A 72-year-old man with a history of atrial fibrillation presents with sudden onset of right-sided weakness and aphasia lasting 30 minutes, then completely resolved. CT head is normal. What is the most likely diagnosis?",
        "options": {"A":"Ischemic stroke","B":"Hemorrhagic stroke","C":"Transient ischemic attack","D":"Todd's paralysis","E":"Hypoglycemia"},
        "correct": "C",
        "category": "Neurology",
    },
    {
        "id": "q5",
        "question": "A 55-year-old smoker presents with chronic productive cough for 3 months per year for the past 3 years, progressive dyspnea, and barrel chest. Spirometry shows FEV1/FVC ratio of 0.60. What is the most likely diagnosis?",
        "options": {"A":"Asthma","B":"Pulmonary fibrosis","C":"Chronic obstructive pulmonary disease","D":"Congestive heart failure","E":"Pneumonia"},
        "correct": "C",
        "category": "Pulmonology",
    },
]
