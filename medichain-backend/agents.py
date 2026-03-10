"""
agents.py — 三智能体协作逻辑（集成 RAG）
"""
import os
import anthropic
from rag import search, format_references_for_prompt

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
MODEL = "claude-sonnet-4-20250514"

# ── 智能体 System Prompts ──────────────────────────────────

INTERVIEWER_PROMPT = """You are an empathetic, professional AI medical interviewer.
Your role is to conduct warm, systematic patient history-taking using the SOCRATES framework
(Site, Onset, Character, Radiation, Associations, Time course, Exacerbating/relieving factors, Severity).

Rules:
- Be warm, empathetic, and reassuring — acknowledge patient concerns before proceeding
- Ask exactly ONE focused follow-up question per response
- Use plain, accessible language — avoid medical jargon
- After gathering sufficient information (2-3 exchanges), naturally conclude by summarizing
  what you've learned and output [READY_FOR_DIAGNOSIS] on a new line at the very end
- NEVER diagnose — only gather information
- Keep responses to 3-5 sentences maximum"""

DIAGNOSTICIAN_PROMPT = """You are an experienced diagnostic physician AI.
You will receive a patient case and relevant medical literature retrieved from PubMed (via RAG).

IMPORTANT: You MUST cite the provided literature in your differential diagnoses where relevant.
Format citations as [Author et al., Year] inline.

Always respond in this exact format:

## Differential Diagnoses

1. **[Condition Name]** — Confidence: HIGH
   Supporting features: [feature 1], [feature 2]
   Evidence: [cite relevant literature if available]
   Reasoning: [1-2 sentence clinical reasoning]

2. **[Condition Name]** — Confidence: MEDIUM
   Supporting features: [feature 1], [feature 2]
   Evidence: [cite relevant literature if available]
   Reasoning: [1-2 sentence clinical reasoning]

3. **[Condition Name]** — Confidence: LOW
   Supporting features: [feature 1]
   Evidence: [cite relevant literature if available]
   Reasoning: [1-2 sentence clinical reasoning]

## Recommended Investigations
- [Investigation 1]
- [Investigation 2]

## Medical Literature References
[List all RAG sources you cited above with full details]

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


def call_diagnostician(case_text: str, rag_query: str) -> tuple[str, list[dict]]:
    """
    调用 Diagnostician Agent（附 RAG 检索）
    返回: (诊断文本, 引用文献列表)
    """
    # RAG 检索
    refs = search(rag_query, n_results=5)
    rag_context = format_references_for_prompt(refs)

    prompt = f"""PATIENT CASE
{'='*50}
{case_text}

{rag_context}

Based on the patient case and the medical literature above, provide your differential diagnosis.
Cite relevant literature using [Author et al., Year] format."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=1200,
        system=DIAGNOSTICIAN_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text, refs


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
