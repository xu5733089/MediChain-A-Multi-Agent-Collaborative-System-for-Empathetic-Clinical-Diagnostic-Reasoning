"""
eval/run_eval.py — MediChain MedQA evaluation runner.

Compares single-LLM baseline vs multi-agent pipeline on 5 USMLE-style questions.
Optionally uses Mistral (via OpenRouter) as an independent judge.

Usage (from medichain-backend/):
    python -m eval.run_eval
    python -m eval.run_eval --no-mistral      # skip Mistral judge
    python -m eval.run_eval --out results/my_run.json
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from .evaluator import (
    SAMPLE_QUESTIONS,
    run_mistral_judge,
    run_multi_agent,
    run_single_llm,
)

RESULTS_DIR = Path(__file__).parent / "results"
CASES_PATH  = Path(__file__).parent / "questions" / "clinical_cases.json"


# ── helpers ────────────────────────────────────────────────────────────────────

def _tick(label: str) -> None:
    print(f"  {label}", end="", flush=True)


def _done(ok: bool, answer: str, expected: str) -> None:
    mark = "[OK]" if ok else "[X]"
    print(f"  {mark}  answered {answer}  (correct: {expected})")


def _bar(n: int, total: int) -> str:
    filled = round(n / total * 20)
    return "[" + "#" * filled + "-" * (20 - filled) + f"]  {n}/{total}"


# ── main ───────────────────────────────────────────────────────────────────────

def main(use_mistral: bool = True, out_path: Path | None = None) -> dict:
    # Load cases from CASES_PATH if it exists, otherwise fall back to SAMPLE_QUESTIONS
    if CASES_PATH.exists():
        with open(CASES_PATH) as f:
            cases = json.load(f)
        print(f"Loaded {len(cases)} evaluation cases.")
        print("(scaffold only — full runner not yet wired to clinical_cases.json)")
        return {"cases": len(cases)}

    has_ant = bool(os.environ.get("ANTHROPIC_API_KEY"))
    has_or  = bool(os.environ.get("OPENROUTER_API_KEY") or os.environ.get("MISTRAL_API_KEY"))
    if not has_ant and not has_or:
        sys.exit(
            "ERROR: No API key found.\n"
            "  Set ANTHROPIC_API_KEY  (Anthropic Console)\n"
            "  or OPENROUTER_API_KEY  (openrouter.ai) in .env"
        )
    backend = "Anthropic" if has_ant else "OpenRouter"

    print()
    print("=" * 54)
    print("  MediChain -- MedQA / USMLE Evaluation")
    print(f"  Questions : {len(SAMPLE_QUESTIONS)}")
    print(f"  Backend   : {backend}")
    print(f"  Mistral   : {'enabled' if use_mistral else 'disabled'}")
    print("=" * 54)

    records = []
    single_correct = 0
    multi_correct  = 0

    for i, q in enumerate(SAMPLE_QUESTIONS, 1):
        qid      = q["id"]
        category = q["category"]
        expected = q["correct"]

        print(f"\n-- Q{i} / {len(SAMPLE_QUESTIONS)}  [{category}]  ({qid}) --")
        print(f"  {q['question'][:120]}{'…' if len(q['question']) > 120 else ''}")

        # ── single LLM ──────────────────────────────────────────────────
        _tick("Single-LLM  ...")
        t0 = time.time()
        single = run_single_llm(q["question"], q["options"])
        single_elapsed = round(time.time() - t0, 1)
        s_ok = single["answer"] == expected
        if s_ok:
            single_correct += 1
        _done(s_ok, single["answer"], expected)

        # ── multi-agent ─────────────────────────────────────────────────
        _tick("Multi-Agent ...")
        t0 = time.time()
        multi = run_multi_agent(q["question"], q["options"])
        multi_elapsed = round(time.time() - t0, 1)
        m_ok = multi["answer"] == expected
        if m_ok:
            multi_correct += 1
        _done(m_ok, multi["answer"], expected)

        # ── Mistral judge ────────────────────────────────────────────────
        judge_result = None
        if use_mistral:
            _tick("Mistral Judge ...")
            judge_result = run_mistral_judge(
                q["question"], q["options"],
                multi["answer"], multi["reasoning"], expected,
            )
            verdict = judge_result.get("verdict", "N/A")
            conf    = judge_result.get("confidence", "")
            print(f"  → {verdict}  [{conf}]")

        records.append({
            "id":             qid,
            "category":       category,
            "expected":       expected,
            "single_answer":  single["answer"],
            "single_correct": s_ok,
            "single_reasoning": single["reasoning"],
            "single_elapsed_s": single_elapsed,
            "multi_answer":   multi["answer"],
            "multi_correct":  m_ok,
            "multi_reasoning": multi["reasoning"],
            "multi_elapsed_s": multi_elapsed,
            "mistral_verdict":     judge_result.get("verdict")     if judge_result else None,
            "mistral_confidence":  judge_result.get("confidence")  if judge_result else None,
            "mistral_assessment":  judge_result.get("assessment")  if judge_result else None,
        })

    # ── summary ─────────────────────────────────────────────────────────────
    n  = len(SAMPLE_QUESTIONS)
    sa = round(single_correct / n * 100)
    ma = round(multi_correct  / n * 100)

    print()
    print("=" * 54)
    print("  RESULTS")
    print("=" * 54)
    print(f"  Single-LLM   accuracy : {_bar(single_correct, n)}  ({sa}%)")
    print(f"  Multi-Agent  accuracy : {_bar(multi_correct,  n)}  ({ma}%)")
    delta = multi_correct - single_correct
    sign  = "+" if delta >= 0 else ""
    print(f"  Delta (multi-single)  : {sign}{delta} questions  ({sign}{ma - sa}pp)")
    print()

    summary = {
        "timestamp":        datetime.now().isoformat(),
        "n_questions":      n,
        "single_correct":   single_correct,
        "single_accuracy":  single_correct / n,
        "multi_correct":    multi_correct,
        "multi_accuracy":   multi_correct  / n,
        "delta_questions":  delta,
        "mistral_enabled":  use_mistral,
        "details":          records,
    }

    # ── save ────────────────────────────────────────────────────────────────
    RESULTS_DIR.mkdir(exist_ok=True)
    if out_path is None:
        ts       = datetime.now().strftime("%Y%m%d_%H%M%S")
        out_path = RESULTS_DIR / f"eval_{ts}.json"

    out_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"  Saved → {out_path}")
    print()

    return summary


# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MediChain USMLE evaluation runner")
    parser.add_argument("--no-mistral", action="store_true",
                        help="Skip Mistral judge (faster, no OpenRouter key needed)")
    parser.add_argument("--out", type=Path, default=None,
                        help="Output JSON path (default: eval/results/eval_<timestamp>.json)")
    args = parser.parse_args()

    main(use_mistral=not args.no_mistral, out_path=args.out)
