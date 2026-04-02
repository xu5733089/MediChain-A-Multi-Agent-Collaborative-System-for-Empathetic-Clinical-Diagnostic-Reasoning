from safety import classify_rule_based, classify_safety


def run_examples():
    samples = [
        "I have chest pain and shortness of breath",
        "The patient is unconscious",
        "There is severe bleeding from the leg",
        "I am coughing blood today",
        "I have mild sore throat for one day",
    ]

    print("Safety examples:")
    for text in samples:
        rule = classify_rule_based(text)
        combined = classify_safety(text)
        print("-" * 80)
        print(f"Input: {text}")
        print(f"Rule: {rule}")
        print(f"Combined: {combined}")
        print(
            f"Final={combined.get('final_risk')} | Rule={combined.get('rule_risk')} | "
            f"LLM={combined.get('llm_risk')} | Warning={combined.get('warning')}"
        )


if __name__ == "__main__":
    run_examples()
