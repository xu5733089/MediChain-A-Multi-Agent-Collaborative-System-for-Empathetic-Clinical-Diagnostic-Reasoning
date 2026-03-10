"""
rag.py — ChromaDB 向量数据库 + 医学文献检索模块
"""
import chromadb
from chromadb.utils import embedding_functions
from pathlib import Path
from typing import Optional

# ── 路径配置 ──────────────────────────────────────────────
DB_PATH = Path(__file__).parent / "chroma_db"
COLLECTION_NAME = "medical_literature"

# ── 使用 sentence-transformers 本地嵌入（无需 OpenAI）────────
EMBED_MODEL = "all-MiniLM-L6-v2"

_client: Optional[chromadb.PersistentClient] = None
_collection = None


def _get_collection():
    global _client, _collection
    if _collection is not None:
        return _collection

    DB_PATH.mkdir(exist_ok=True)
    _client = chromadb.PersistentClient(path=str(DB_PATH))

    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBED_MODEL
    )
    _collection = _client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"},
    )
    return _collection


def get_collection_size() -> int:
    """返回当前文献库中的文档数量"""
    try:
        return _get_collection().count()
    except Exception:
        return 0


def add_documents(documents: list[dict]) -> int:
    """
    批量添加文献到向量库。
    每个 document 格式：
    {
        "id":       str,   # 唯一 ID（如 PubMed PMID）
        "text":     str,   # 摘要全文
        "title":    str,
        "authors":  str,
        "year":     str,
        "source":   str,   # 期刊名
        "url":      str,
    }
    """
    col = _get_collection()
    existing_ids = set(col.get(ids=[d["id"] for d in documents])["ids"])

    new_docs = [d for d in documents if d["id"] not in existing_ids]
    if not new_docs:
        return 0

    col.add(
        ids=[d["id"] for d in new_docs],
        documents=[d["text"] for d in new_docs],
        metadatas=[
            {
                "title":   d["title"],
                "authors": d["authors"],
                "year":    d["year"],
                "source":  d["source"],
                "url":     d["url"],
            }
            for d in new_docs
        ],
    )
    return len(new_docs)


def search(query: str, n_results: int = 5) -> list[dict]:
    """
    语义检索：返回与 query 最相关的医学文献。
    返回格式：
    [
        {
            "title": ..., "authors": ..., "year": ...,
            "source": ..., "url": ...,
            "excerpt": ...,   # 摘要前300字
            "score": float,   # 相似度 (0~1, 越高越相关)
        },
        ...
    ]
    """
    col = _get_collection()
    if col.count() == 0:
        return []

    results = col.query(
        query_texts=[query],
        n_results=min(n_results, col.count()),
        include=["documents", "metadatas", "distances"],
    )

    output = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        score = round(1 - dist, 4)  # cosine distance → similarity
        if score < 0.25:            # 过滤低相关性文献
            continue
        output.append(
            {
                "title":   meta.get("title", "Untitled"),
                "authors": meta.get("authors", ""),
                "year":    meta.get("year", ""),
                "source":  meta.get("source", ""),
                "url":     meta.get("url", ""),
                "excerpt": doc[:300] + ("…" if len(doc) > 300 else ""),
                "score":   score,
            }
        )
    return output


def format_references_for_prompt(refs: list[dict]) -> str:
    """将检索到的文献格式化为 prompt 中使用的字符串"""
    if not refs:
        return "No relevant medical literature found in local database."

    lines = ["=== RELEVANT MEDICAL LITERATURE (RAG) ==="]
    for i, r in enumerate(refs, 1):
        lines.append(
            f"\n[{i}] {r['title']}\n"
            f"    Authors: {r['authors']} ({r['year']}) — {r['source']}\n"
            f"    Relevance Score: {r['score']:.2f}\n"
            f"    Excerpt: {r['excerpt']}\n"
            f"    URL: {r['url']}"
        )
    lines.append("\n==========================================")
    return "\n".join(lines)
