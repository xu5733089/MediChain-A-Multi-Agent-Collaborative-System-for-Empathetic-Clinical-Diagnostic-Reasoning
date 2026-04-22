"""
rag.py — Qdrant 向量数据库 + 医学文献混合检索模块 (Dense + BM25 Hybrid Search, RRF Fusion)
"""
import json
import math
import re
import hashlib
from pathlib import Path
from typing import Optional

from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer, CrossEncoder

# ── 路径配置 ──────────────────────────────────────────────
DB_DIR = Path(__file__).parent / "qdrant_db"
BM25_PARAMS_PATH = DB_DIR / "bm25_params.json"
COLLECTION_NAME = "medical_literature"

# ── Embedding 配置 ────────────────────────────────────────
DENSE_MODEL_NAME = "FremyCompany/BioLORD-2023"
DENSE_DIM = 768

# ── Reranker 配置 ─────────────────────────────────────────
RERANKER_MODEL_NAME = "ncbi/MedCPT-Cross-Encoder"
RERANKER_CANDIDATES = 20   # 初检候选数，rerank 后取 top-n_results

# ── 全局单例 ──────────────────────────────────────────────
_client: Optional[QdrantClient] = None
_dense_model: Optional[SentenceTransformer] = None
_reranker: Optional[CrossEncoder] = None
_bm25_vocab: Optional[dict] = None  # word -> idf


def _get_client() -> QdrantClient:
    global _client
    if _client is not None:
        return _client

    import os
    qdrant_host = os.environ.get("QDRANT_HOST")
    if qdrant_host:
        # Docker / remote Qdrant
        qdrant_port = int(os.environ.get("QDRANT_PORT", 6333))
        _client = QdrantClient(host=qdrant_host, port=qdrant_port)
    else:
        # 本地文件模式（开发用）
        DB_DIR.mkdir(exist_ok=True)
        _client = QdrantClient(path=str(DB_DIR))

    # 若 collection 不存在则创建
    existing = [c.name for c in _client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        _create_collection()

    return _client


def _get_dense_model() -> SentenceTransformer:
    global _dense_model
    if _dense_model is None:
        _dense_model = SentenceTransformer(DENSE_MODEL_NAME)
    return _dense_model


def _get_reranker() -> CrossEncoder:
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder(RERANKER_MODEL_NAME, max_length=512)
    return _reranker


def _rerank(query: str, results: list[dict], top_n: int) -> list[dict]:
    """用 MedCPT cross-encoder 对初检结果重排，返回 top_n 条。"""
    if not results:
        return results
    reranker = _get_reranker()
    pairs = [(query, r["excerpt"]) for r in results]
    scores = reranker.predict(pairs).tolist()
    for i, r in enumerate(results):
        r["score"] = round(float(scores[i]), 4)
    return sorted(results, key=lambda x: x["score"], reverse=True)[:top_n]


def _create_collection():
    """创建 Qdrant Collection，包含 dense 和 sparse named vectors"""
    _client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config={
            "dense": models.VectorParams(
                size=DENSE_DIM,
                distance=models.Distance.COSINE,
            ),
        },
        sparse_vectors_config={
            "sparse": models.SparseVectorParams(),
        },
    )


def _str_to_point_id(s: str) -> str:
    """将字符串 ID 转为 Qdrant 兼容的确定性 UUID"""
    return hashlib.md5(s.encode()).hexdigest()[:32]
    # 返回32位hex，可作为 Qdrant point id


def _str_to_int_id(s: str) -> int:
    """将字符串 ID 转为 Qdrant 兼容的正整数 ID"""
    return int(hashlib.sha256(s.encode()).hexdigest()[:15], 16)


# ── BM25 稀疏向量 ────────────────────────────────────────

def _tokenize(text: str) -> list[str]:
    """简单分词：小写 + 按字母数字拆分"""
    return re.findall(r"[a-z0-9]+", text.lower())


def _load_bm25_vocab():
    global _bm25_vocab
    if _bm25_vocab is not None:
        return
    if BM25_PARAMS_PATH.exists():
        with open(BM25_PARAMS_PATH, "r") as f:
            data = json.load(f)
        _bm25_vocab = data.get("vocab", {})
    else:
        _bm25_vocab = {}


def _save_bm25_vocab():
    DB_DIR.mkdir(exist_ok=True)
    with open(BM25_PARAMS_PATH, "w") as f:
        json.dump({"vocab": _bm25_vocab}, f)


def fit_bm25(documents: list[str]):
    """根据语料库计算 IDF 并保存"""
    global _bm25_vocab
    n = len(documents)
    if n == 0:
        _bm25_vocab = {}
        return
    df: dict[str, int] = {}
    for doc in documents:
        for t in set(_tokenize(doc)):
            df[t] = df.get(t, 0) + 1
    _bm25_vocab = {
        word: math.log((n - freq + 0.5) / (freq + 0.5) + 1)
        for word, freq in df.items()
    }
    _save_bm25_vocab()


def _text_to_sparse(text: str) -> tuple[list[int], list[float]]:
    """将文本转换为 BM25 稀疏向量 (indices, values)"""
    _load_bm25_vocab()
    if not _bm25_vocab:
        return [], []

    tokens = _tokenize(text)
    if not tokens:
        return [], []

    tf: dict[str, int] = {}
    for t in tokens:
        tf[t] = tf.get(t, 0) + 1

    k1, b, avgdl = 1.5, 0.75, 200.0
    doc_len = len(tokens)
    indices = []
    values = []
    for word, freq in tf.items():
        idf = _bm25_vocab.get(word, 0.0)
        if idf <= 0:
            continue
        tf_norm = (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * doc_len / avgdl))
        score = idf * tf_norm
        dim_id = abs(hash(word)) % (2**31)
        indices.append(dim_id)
        values.append(score)
    return indices, values


# ── 公开 API（签名不变）────────────────────────────────────

def get_collection_size() -> int:
    """返回当前文献库中的文档数量"""
    try:
        client = _get_client()
        info = client.get_collection(collection_name=COLLECTION_NAME)
        return info.points_count
    except Exception:
        return 0


def add_documents(documents: list[dict]) -> int:
    """
    批量添加文献到向量库。
    每个 document 格式：
    {
        "id":       str,   # 唯一 ID（主键）
        "text":     str,   # 用于向量化的正文
        "title":    str,
        "authors":  str,
        "year":     str,
        "source":   str,
        "url":      str,
        "qid":      str,   # MedQuAD 问题 ID（可选）
        "focus":    str,   # 疾病主题（可选）
        "qtype":    str,   # 问题类型（可选）
        "document_id": str,# 原始文档 ID（可选）
    }
    """
    client = _get_client()
    model = _get_dense_model()

    # 去重：检查已存在的 ID
    existing_ids: set[str] = set()
    try:
        for d in documents:
            point_id = _str_to_int_id(d["id"])
            pts = client.retrieve(
                collection_name=COLLECTION_NAME,
                ids=[point_id],
            )
            if pts:
                existing_ids.add(d["id"])
    except Exception:
        pass

    new_docs = [d for d in documents if d["id"] not in existing_ids]
    if not new_docs:
        return 0

    # 如果 BM25 词表尚未建立，先 fit
    _load_bm25_vocab()
    if not _bm25_vocab:
        all_texts: list[str] = []
        # 从已有数据获取文本（用于 fit BM25）
        try:
            scroll_result = client.scroll(
                collection_name=COLLECTION_NAME,
                limit=10000,
                with_payload=True,
            )
            all_texts = [p.payload.get("text", "") for p in scroll_result[0]]
        except Exception:
            pass
        all_texts.extend([d["text"] for d in new_docs])
        fit_bm25(all_texts)

    # 编码 dense 向量
    texts = [d["text"] for d in new_docs]
    dense_vectors = model.encode(texts, normalize_embeddings=True).tolist()

    # 构建 points
    points = []
    for i, d in enumerate(new_docs):
        sp_indices, sp_values = _text_to_sparse(d["text"])
        points.append(
            models.PointStruct(
                id=_str_to_int_id(d["id"]),
                vector={
                    "dense": dense_vectors[i],
                    "sparse": models.SparseVector(
                        indices=sp_indices if sp_indices else [0],
                        values=sp_values if sp_values else [0.0],
                    ),
                },
                payload={
                    "doc_id":      d["id"],
                    "text":        d["text"][:65000],
                    "title":       d.get("title", ""),
                    "authors":     d.get("authors", ""),
                    "year":        d.get("year", ""),
                    "source":      d.get("source", ""),
                    "url":         d.get("url", ""),
                    "qid":         d.get("qid", ""),
                    "focus":       d.get("focus", ""),
                    "qtype":       d.get("qtype", ""),
                    "document_id": d.get("document_id", ""),
                },
            )
        )

    # 分批 upsert（Qdrant 建议每批不超过 100）
    batch_size = 100
    for start in range(0, len(points), batch_size):
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=points[start : start + batch_size],
        )
    return len(points)


def search(query: str, n_results: int = 5) -> list[dict]:
    """
    混合检索：Dense + BM25 Sparse，RRF 融合。
    返回格式：
    [
        {
            "title": ..., "authors": ..., "year": ...,
            "source": ..., "url": ...,
            "qid": ..., "focus": ..., "qtype": ..., "document_id": ...,
            "excerpt": ...,   # 摘要前300字
            "score": float,   # 融合分数 (0~1, 越高越相关)
        },
        ...
    ]
    """
    client = _get_client()
    count = get_collection_size()
    if count == 0:
        return []

    model = _get_dense_model()
    # 初检候选数：取 RERANKER_CANDIDATES 或 n_results*4 中的较大值，供 reranker 使用
    prefetch_limit = min(max(RERANKER_CANDIDATES, n_results * 4), count)

    # Dense query vector
    dense_vec = model.encode([query], normalize_embeddings=True).tolist()[0]

    # Sparse query vector
    sp_indices, sp_values = _text_to_sparse(query)

    # 构建 prefetch 列表
    prefetch = [
        models.Prefetch(
            query=dense_vec,
            using="dense",
            limit=prefetch_limit,
        ),
    ]

    # 仅在有有效 sparse 向量时添加 sparse prefetch
    if sp_indices:
        prefetch.append(
            models.Prefetch(
                query=models.SparseVector(indices=sp_indices, values=sp_values),
                using="sparse",
                limit=prefetch_limit,
            ),
        )

    # RRF 融合查询，多取候选供 reranker 使用
    results = client.query_points(
        collection_name=COLLECTION_NAME,
        prefetch=prefetch,
        query=models.FusionQuery(fusion=models.Fusion.RRF),
        limit=max(RERANKER_CANDIDATES, n_results * 2),
        with_payload=True,
    )

    output = []
    if not results.points:
        return []

    max_score = max(p.score for p in results.points) if results.points else 1.0
    if max_score <= 0:
        max_score = 1.0

    for hit in results.points:
        score = round(hit.score / max_score, 4)
        if score < 0.15:
            continue
        payload = hit.payload or {}
        doc_text = payload.get("text", "")
        output.append({
            "title":       payload.get("title", "Untitled"),
            "authors":     payload.get("authors", ""),
            "year":        payload.get("year", ""),
            "source":      payload.get("source", ""),
            "url":         payload.get("url", ""),
            "qid":         payload.get("qid", ""),
            "focus":       payload.get("focus", ""),
            "qtype":       payload.get("qtype", ""),
            "document_id": payload.get("document_id", ""),
            "excerpt":     doc_text[:300] + ("…" if len(doc_text) > 300 else ""),
            "score":       score,
        })

    # MedCPT cross-encoder rerank，覆盖 RRF 分数，返回 top n_results
    return _rerank(query, output, n_results)


def multi_search(queries: list[str], n_results: int = 5) -> list[dict]:
    """
    多查询融合检索：对多个 query 分别用 Qdrant hybrid search，
    去重后按分数排序返回，提高召回率。
    """
    seen: dict[str, dict] = {}  # qid/excerpt → result (keep highest score)

    for query in queries:
        if not query.strip():
            continue
        for hit in search(query, n_results=n_results * 2):
            key = hit.get("qid") or hit["excerpt"][:80]
            if key not in seen or seen[key]["score"] < hit["score"]:
                seen[key] = hit

    return sorted(seen.values(), key=lambda x: x["score"], reverse=True)[:n_results]


def format_references_for_prompt(refs: list[dict]) -> str:
    """将检索到的文献格式化为 prompt 中使用的字符串"""
    if not refs:
        return "No relevant medical literature found in local database."

    lines = ["=== RELEVANT MEDICAL LITERATURE (RAG — MedQuAD + PubMed Hybrid Search) ==="]
    for i, r in enumerate(refs, 1):
        source = r.get("source", "") or "UnknownSource"
        focus = r.get("focus", "") or r.get("title", "Untitled")
        qid = r.get("qid", "") or "N/A"
        qtype = r.get("qtype", "") or "N/A"
        lines.append(
            f"\n[{i}] {r['title']}\n"
            f"    Citation Key: [{source} | {focus} | {qid}]\n"
            f"    Source: {source} | Focus: {focus} | QType: {qtype} | QID: {qid}\n"
            f"    Relevance Score: {r['score']:.2f}\n"
            f"    Excerpt: {r['excerpt']}\n"
            f"    URL: {r['url']}"
        )
    lines.append("\n==========================================")
    return "\n".join(lines)
