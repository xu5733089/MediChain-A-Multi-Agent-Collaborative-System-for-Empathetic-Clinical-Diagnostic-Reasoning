"""
eval.py — PROJ-14 MedQA 评估模块
对比 Multi-Agent vs Single-LLM 在 USMLE 风格题目上的表现
"""
import os
import anthropic

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
MODEL  = "claude-sonnet-4-20250514"

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


def run_single_llm(question: str, options: dict) -> dict:
    """单 LLM 基线测试"""
    opts_text = "\n".join(f"{k}. {v}" for k, v in options.items())
    prompt = f"Question:\n{question}\n\nOptions:\n{opts_text}"

    resp = client.messages.create(
        model=MODEL, max_tokens=300,
        system=SINGLE_LLM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    text = resp.content[0].text
    answer, reasoning = _parse_answer(text)
    return {"answer": answer, "reasoning": reasoning, "raw": text}


def run_multi_agent(question: str, options: dict) -> dict:
    """三智能体管道测试"""
    opts_text = "\n".join(f"{k}. {v}" for k, v in options.items())

    # Step 1: Interviewer — 提取关键临床特征
    int_resp = client.messages.create(
        model=MODEL, max_tokens=300,
        system="""You are the Interviewer Agent in a medical reasoning pipeline.
Extract and list the key clinical features from this USMLE question that are most relevant for diagnosis.
Be concise — list 4-6 bullet points.""",
        messages=[{"role": "user", "content": f"Question:\n{question}\n\nOptions:\n{opts_text}"}],
    )
    interviewer_output = int_resp.content[0].text

    # Step 2: Diagnostician — 分析鉴别诊断
    diag_resp = client.messages.create(
        model=MODEL, max_tokens=400,
        system="""You are the Diagnostician Agent. Based on the clinical features provided,
analyze the differential diagnoses and identify the most likely answer.
Consider each option systematically.""",
        messages=[{"role": "user", "content":
            f"Clinical features identified:\n{interviewer_output}\n\n"
            f"Original question:\n{question}\n\nOptions:\n{opts_text}"}],
    )
    diagnostician_output = diag_resp.content[0].text

    # Step 3: Critic — 最终审查和答案
    critic_resp = client.messages.create(
        model=MODEL, max_tokens=400,
        system=MULTI_AGENT_SYSTEM,
        messages=[{"role": "user", "content":
            f"Interviewer Analysis:\n{interviewer_output}\n\n"
            f"Diagnostician Analysis:\n{diagnostician_output}\n\n"
            f"Original question:\n{question}\n\nOptions:\n{opts_text}"}],
    )
    critic_output = critic_resp.content[0].text
    answer, reasoning = _parse_answer(critic_output)

    return {
        "answer": answer,
        "reasoning": reasoning,
        "raw": critic_output,
        "pipeline": {
            "interviewer": interviewer_output,
            "diagnostician": diagnostician_output,
            "critic": critic_output,
        },
    }


def _parse_answer(text: str) -> tuple:
    """从输出中解析答案字母和推理"""
    answer = "?"
    reasoning = text[:200]

    for line in text.split("\n"):
        line = line.strip()
        if line.upper().startswith("ANSWER:"):
            parts = line.split(":", 1)
            if len(parts) > 1:
                ans = parts[1].strip().upper()
                # 提取第一个字母
                for c in ans:
                    if c in "ABCDE":
                        answer = c
                        break
        elif line.upper().startswith("REASONING:"):
            parts = line.split(":", 1)
            if len(parts) > 1:
                reasoning = parts[1].strip()

    return answer, reasoning


# USMLE 示例题库（内置5道经典题）
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
