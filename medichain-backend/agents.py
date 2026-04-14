"""
agents.py — 三智能体协作逻辑（集成 RAG）
"""
import os
import anthropic
from rag import search, multi_search, format_references_for_prompt

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-20250514"

# ── 智能体 System Prompts ──────────────────────────────────

INTERVIEWER_PROMPT = """You are an empathetic, professional AI medical interviewer.
Your role is to conduct warm, systematic patient history-taking using the SOCRATES framework
(Site, Onset, Character, Radiation, Associations, Time course, Exacerbating/relieving factors, Severity).

Rules:
- Be warm, empathetic, and reassuring — acknowledge patient concerns before proceeding
- Preserve patient speaking space — avoid interrogating with too many questions at once
- Ask 1 focused follow-up question by default; when multiple SOCRATES dimensions are clearly missing,
  you may ask up to 3 tightly related short questions in one turn
- Prefer "coverage-first": ask only for missing/unclear SOCRATES details, and avoid repeating answered points
- Use plain, accessible language — avoid medical jargon
- Adapt your questions dynamically to the patient's actual answers — do not follow a rigid script
- Explore each SOCRATES dimension as relevant: site, onset, character, radiation, associations,
  time course, exacerbating/relieving factors, severity, and any relevant medical history
- If the patient has uploaded a medical image (you will see it as [ADDITIONAL CONTEXT] with AI image analysis),
  acknowledge the image and ask relevant follow-up questions based on its findings
- After gathering comprehensive information across the relevant SOCRATES dimensions
  (typically 5-8 exchanges, depending on case complexity), naturally conclude by:
  1. Briefly summarising the key points you have gathered
  2. Inviting any final patient additions in one brief sentence
  3. Telling the patient you now have enough information to proceed with analysis
  4. Outputting [READY_FOR_DIAGNOSIS] on a new line at the very end of your response
- NEVER diagnose — only gather information
- Keep each response to 3-5 sentences maximum"""

DIAGNOSTICIAN_PROMPT = """You are an experienced diagnostic physician AI.
You will receive a patient case and relevant medical QA knowledge retrieved from a local MedQuAD-style RAG index.

IMPORTANT RULES:
- Use only the retrieved knowledge as evidence. Do not fabricate citations.
- If evidence is insufficient or conflicting, explicitly say so.
- Cite evidence inline using the provided citation key format:
    [Source | Focus | QID]

Always respond in this exact format:

## Differential Diagnoses

1. **[Condition Name]** — Confidence: HIGH
   Supporting features: [feature 1], [feature 2]
    Evidence: [cite relevant retrieved QA evidence if available]
   Reasoning: [1-2 sentence clinical reasoning]

2. **[Condition Name]** — Confidence: MEDIUM
   Supporting features: [feature 1], [feature 2]
    Evidence: [cite relevant retrieved QA evidence if available]
   Reasoning: [1-2 sentence clinical reasoning]

3. **[Condition Name]** — Confidence: LOW
   Supporting features: [feature 1]
    Evidence: [cite relevant retrieved QA evidence if available]
   Reasoning: [1-2 sentence clinical reasoning]

## Recommended Investigations
- [Investigation 1]
- [Investigation 2]

## Medical Literature References
[List all cited RAG sources using Source / Focus / QID / URL]

## Clinical Summary
[2-3 sentences summarizing diagnostic reasoning]"""

CRITIC_PROMPT = """You are a senior medical consultant AI reviewing a diagnostic assessment.

Always respond in this exact format:

## Validation
[APPROVED ✓ / NEEDS REVISION ⚠] — [one sentence reason]

## Evidence Quality Assessment
- RAG Citations: [comment on quality and relevance of cited literature]
- Evidence gaps: [what additional studies would strengthen the diagnosis]

## Potential Gaps or Biases
- [Gap 1]
- [Gap 2]

## Safety Flags
⚠️ [Critical red flag symptoms requiring urgent attention, OR: "No immediate red flags identified."]

## Missing Information
- [Key clinical detail needed]

## Final Recommendation
[1-2 sentences on the most critical next steps]"""


# ── 智能体调用 ────────────────────────────────────────────

def call_interviewer(messages: list[dict]) -> str:
    """调用 Interviewer Agent"""
    response = client.messages.create(
        model=MODEL,
        max_tokens=600,
        system=INTERVIEWER_PROMPT,
        messages=messages,
    )
    return response.content[0].text


def _rewrite_query_for_rag(case_text: str) -> str:
    """
    用 LLM 将患者口语描述重写为医学专业检索词，
    弥合患者用语与医学文献之间的语义鸿沟。
    """
    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=120,
            messages=[{
                "role": "user",
                "content": (
                    "You are a medical search query optimizer. "
                    "Extract 5-8 precise medical search terms from the patient case below. "
                    "Use professional medical terminology (e.g. 'myocardial infarction' not 'heart attack'). "
                    "Include relevant symptoms, suspected conditions, and anatomical terms. "
                    "Output ONLY the terms, comma-separated, nothing else.\n\n"
                    f"Patient case:\n{case_text}"
                ),
            }],
        )
        return response.content[0].text.strip()
    except Exception:
        return case_text  # fallback: 使用原始文本


def _build_rag_queries(rag_query: str) -> list[str]:
    """
    结合 LLM 改写 + 多视角扩展，生成多个检索 query 提高召回率。
    """
    medical = _rewrite_query_for_rag(rag_query)
    queries = [medical, rag_query]
    queries.append(f"treatment and diagnosis of {medical}")
    queries.append(f"What is {medical}?")
    return list(dict.fromkeys(q for q in queries if q.strip()))


def rewrite_image_findings_for_rag(image_analyses: list[str]) -> str:
    """
    将多模态视觉分析结果通过 LLM 提取医学关键词，
    用于 RAG 检索，而非粗暴截断。
    """
    if not image_analyses:
        return ""
    combined = "\n---\n".join(image_analyses)
    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=150,
            messages=[{
                "role": "user",
                "content": (
                    "You are a medical image analysis summarizer. "
                    "Extract the key medical findings, suspected conditions, "
                    "anatomical structures, and relevant clinical terms from the image analysis below. "
                    "Output ONLY the medical terms and findings, comma-separated, nothing else.\n\n"
                    f"Image analysis:\n{combined[:3000]}"
                ),
            }],
        )
        return response.content[0].text.strip()
    except Exception:
        # fallback: take first 300 chars of each analysis
        return " ".join(a[:300] for a in image_analyses)


def call_diagnostician(case_text: str, rag_query: str) -> tuple[str, list[dict]]:
    """
    调用 Diagnostician Agent（附 RAG 检索）
    返回: (诊断文本, 引用文献列表)
    """
    refs = multi_search(_build_rag_queries(rag_query), n_results=6)
    rag_context = format_references_for_prompt(refs)

    prompt = f"""PATIENT CASE
{'='*50}
{case_text}

{rag_context}

Based on the patient case and the medical literature above, provide your differential diagnosis.
Use only relevant retrieved evidence and cite using [Source | Focus | QID]."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=1200,
        system=DIAGNOSTICIAN_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text, refs


def call_diagnostician_cot(case_text: str, rag_query: str) -> tuple[str, str, list[dict]]:
    """
    调用 Diagnostician Agent，启用 Extended Thinking (CoT)
    返回: (诊断文本, 思维链文本, 引用文献列表)
    """
    refs = multi_search(_build_rag_queries(rag_query), n_results=6)
    rag_context = format_references_for_prompt(refs)

    prompt = f"""PATIENT CASE
{'='*50}
{case_text}

{rag_context}

Based on the patient case and the medical literature above, provide your differential diagnosis.
Use only relevant retrieved evidence and cite using [Source | Focus | QID]."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=16000,
        thinking={"type": "enabled", "budget_tokens": 8000},
        system=DIAGNOSTICIAN_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    thinking = ""
    diagnosis = ""
    for block in response.content:
        if block.type == "thinking":
            thinking = block.thinking
        elif block.type == "text":
            diagnosis = block.text

    return diagnosis, thinking, refs


def call_critic(case_text: str, diagnosis: str) -> str:
    """调用 Critic Agent"""
    prompt = f"""Please review this diagnostic assessment:

{diagnosis}

---
Original patient case:
{case_text}

Provide your senior consultant review focusing on evidence quality, safety, and clinical gaps."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=800,
        system=CRITIC_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


def call_critic_cot(case_text: str, diagnosis: str) -> tuple[str, str]:
    """
    调用 Critic Agent，启用 Extended Thinking (CoT)
    返回: (审查文本, 思维链文本)
    """
    prompt = f"""Please review this diagnostic assessment:

{diagnosis}

---
Original patient case:
{case_text}

Provide your senior consultant review focusing on evidence quality, safety, and clinical gaps."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=10000,
        thinking={"type": "enabled", "budget_tokens": 5000},
        system=CRITIC_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    thinking = ""
    review = ""
    for block in response.content:
        if block.type == "thinking":
            thinking = block.thinking
        elif block.type == "text":
            review = block.text

    return review, thinking
