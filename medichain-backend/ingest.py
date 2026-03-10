"""
ingest.py — 从 PubMed 抓取医学文献并写入 ChromaDB
用法：
    python ingest.py                    # 使用默认搜索词
    python ingest.py --terms "asthma"   # 自定义搜索词
    python ingest.py --max 200          # 抓取更多文献
    python ingest.py --status           # 查看当前库大小
"""
import argparse
import time
import sys
from urllib.request import urlopen
from urllib.parse import urlencode
from urllib.error import URLError
import json

from rag import add_documents, get_collection_size

# ── 默认搜索词（覆盖常见疾病领域）────────────────────────────
DEFAULT_TERMS = [
    "differential diagnosis clinical symptoms",
    "headache migraine diagnosis treatment",
    "chest pain cardiac diagnosis",
    "abdominal pain diagnosis",
    "fever infectious disease diagnosis",
    "hair loss alopecia treatment",
    "diabetes mellitus diagnosis management",
    "hypertension cardiovascular risk",
    "depression anxiety mental health diagnosis",
    "asthma COPD respiratory diagnosis",
    "anemia hematology diagnosis",
    "thyroid disorder diagnosis treatment",
    "urinary tract infection diagnosis",
    "skin rash dermatology diagnosis",
    "back pain musculoskeletal diagnosis",
]

ENTREZ_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"


def fetch_pmids(term: str, max_results: int = 20) -> list[str]:
    """搜索 PubMed，返回 PMID 列表"""
    params = urlencode({
        "db": "pubmed",
        "term": f"{term}[Title/Abstract] AND hasabstract[text]",
        "retmax": max_results,
        "retmode": "json",
        "sort": "relevance",
    })
    url = f"{ENTREZ_BASE}/esearch.fcgi?{params}"
    try:
        with urlopen(url, timeout=15) as r:
            data = json.loads(r.read())
        return data.get("esearchresult", {}).get("idlist", [])
    except (URLError, json.JSONDecodeError) as e:
        print(f"  ⚠ Search failed for '{term}': {e}")
        return []


def fetch_article_details(pmids: list[str]) -> list[dict]:
    """批量获取文献详情（标题、摘要、作者等）"""
    if not pmids:
        return []

    params = urlencode({
        "db": "pubmed",
        "id": ",".join(pmids),
        "retmode": "xml",
        "rettype": "abstract",
    })
    url = f"{ENTREZ_BASE}/efetch.fcgi?{params}"

    try:
        with urlopen(url, timeout=20) as r:
            xml_text = r.read().decode("utf-8")
    except URLError as e:
        print(f"  ⚠ Fetch failed: {e}")
        return []

    # 简单 XML 解析（避免依赖 lxml）
    import re
    articles = []
    article_blocks = re.findall(
        r"<PubmedArticle>(.*?)</PubmedArticle>", xml_text, re.DOTALL
    )

    for block in article_blocks:
        def extract(tag, text=block):
            m = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", text, re.DOTALL)
            return re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else ""

        pmid    = extract("PMID")
        title   = extract("ArticleTitle")
        abstract_block = re.search(
            r"<AbstractText[^>]*>(.*?)</AbstractText>", block, re.DOTALL
        )
        abstract = (
            re.sub(r"<[^>]+>", "", abstract_block.group(1)).strip()
            if abstract_block else ""
        )

        # 年份
        year_m = re.search(r"<PubDate>.*?<Year>(\d{4})</Year>", block, re.DOTALL)
        year = year_m.group(1) if year_m else "N/A"

        # 期刊
        journal = extract("Title") or extract("ISOAbbreviation")

        # 作者（最多3个）
        last_names = re.findall(r"<LastName>(.*?)</LastName>", block)
        authors = ", ".join(last_names[:3]) + (" et al." if len(last_names) > 3 else "")

        if not pmid or not abstract or len(abstract) < 80:
            continue  # 跳过无摘要文献

        articles.append({
            "id":      f"pmid_{pmid}",
            "text":    f"{title}\n\n{abstract}",
            "title":   title,
            "authors": authors,
            "year":    year,
            "source":  journal,
            "url":     f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
        })

    return articles


def run_ingestion(terms: list[str], per_term: int = 15) -> None:
    print("\n🔬 MediChain RAG Ingestion Pipeline")
    print(f"   Model:      all-MiniLM-L6-v2 (local)")
    print(f"   Database:   ./chroma_db")
    print(f"   Terms:      {len(terms)}")
    print(f"   Per term:   {per_term} articles")
    print(f"   Initial DB size: {get_collection_size()} docs\n")

    total_added = 0

    for i, term in enumerate(terms, 1):
        print(f"[{i:>2}/{len(terms)}] Searching: \"{term}\"")

        pmids = fetch_pmids(term, per_term)
        if not pmids:
            print("       → No results found\n")
            continue
        print(f"       → Found {len(pmids)} articles")

        articles = fetch_article_details(pmids)
        if not articles:
            print("       → No abstracts available\n")
            continue

        added = add_documents(articles)
        total_added += added
        print(f"       → Added {added} new docs (skipped {len(articles)-added} duplicates)\n")

        time.sleep(0.4)   # NCBI rate limit: max 3 req/sec

    final_size = get_collection_size()
    print(f"✅ Ingestion complete!")
    print(f"   Added this run:  {total_added} documents")
    print(f"   Total DB size:   {final_size} documents")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MediChain PubMed Ingestion")
    parser.add_argument("--terms", nargs="+", default=None, help="Custom search terms")
    parser.add_argument("--max",   type=int,  default=15,   help="Articles per term")
    parser.add_argument("--status", action="store_true",    help="Show DB size and exit")
    args = parser.parse_args()

    if args.status:
        print(f"📚 ChromaDB contains {get_collection_size()} documents")
        sys.exit(0)

    terms = args.terms if args.terms else DEFAULT_TERMS
    run_ingestion(terms, per_term=args.max)
