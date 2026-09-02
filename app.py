import os
import sys
import json
import urllib.request
import urllib.error
import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

# Force UTF-8 stdout for Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Database & Model Configurations
CHROMA_DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bis_vector_db")
COLLECTION_NAME = "bis_documents"
OLLAMA_API_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL_NAME = "llama3.2"

class RAGEngine:
    def __init__(self):
        print(f"[RAG] Initializing Chroma Client at '{CHROMA_DB_DIR}'...")
        self.chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
        self.embedding_fn = DefaultEmbeddingFunction()
        try:
            self.collection = self.chroma_client.get_collection(
                name=COLLECTION_NAME,
                embedding_function=self.embedding_fn
            )
            print(f"[RAG] Collection '{COLLECTION_NAME}' loaded. Total chunks: {self.collection.count()}")
        except Exception as e:
            print(f"[RAG WARNING] Collection not found or error: {e}")
            self.collection = None

    def retrieve_context(self, query: str, top_k: int = 5):
        if not self.collection:
            return [], []

        results = self.collection.query(
            query_texts=[query],
            n_results=top_k,
            include=["documents", "metadatas", "distances"]
        )

        documents = results["documents"][0] if results["documents"] else []
        metadatas = results["metadatas"][0] if results["metadatas"] else []
        distances = results["distances"][0] if results["distances"] else []

        sources = []
        context_blocks = []

        for idx, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances)):
            page_num = meta.get("page_number", "Unknown")
            sources.append({
                "chunk_id": meta.get("chunk_id", idx),
                "page_number": page_num,
                "distance": round(float(dist), 4),
                "content": doc
            })
            context_blocks.append(f"--- DOCUMENT EXCERPT (Page {page_num}) ---\n{doc}")

        return "\n\n".join(context_blocks), sources

    def generate_rag_response(self, user_query: str, top_k: int = 5):
        context_str, sources = self.retrieve_context(user_query, top_k=top_k)

        if not context_str.strip():
            return {
                "answer": "No relevant context found in the Bureau of Indian Standards (BIS) document database.",
                "sources": [],
                "is_rag": True
            }

        # Strict RAG Prompt to prevent hallucination or generic non-RAG responses
        prompt = f"""You are a strict technical compliance assistant for Bureau of Indian Standards (BIS) documentation.
Answer the user query based ONLY on the provided context retrieved from the official BIS document (Electric Equipments.pdf).

CRITICAL CONSTRAINTS & RULES:
1. Answer strictly using ONLY the provided Document Excerpts below. Do NOT use outside general knowledge or make assumptions.
2. If the exact answer or standard parameter is stated in the excerpts, provide a clear, precise, technical answer. Citing specific page numbers or sections from the context is required when available.
3. If the provided context does NOT contain enough information to answer the question directly, respond clearly with:
   "Information not present in the provided Bureau of Indian Standards (BIS) document."
4. Maintain high fidelity for numbers, ratings, formulas, table column values, and technical standard requirements.

DOCUMENT EXCERPTS:
{context_str}

USER QUESTION:
{user_query}

STRICT RAG ANSWER:"""

        payload = {
            "model": OLLAMA_MODEL_NAME,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.0,
                "top_p": 0.1
            }
        }

        try:
            req = urllib.request.Request(
                OLLAMA_API_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=45) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                answer = res_data.get("response", "").strip()

            return {
                "answer": answer,
                "sources": sources,
                "is_rag": True,
                "model_used": OLLAMA_MODEL_NAME
            }

        except urllib.error.URLError as err:
            # Fallback if Ollama service is unavailable
            return {
                "answer": f"Ollama Service Error: {err}. Based on retrieved context from BIS Document:\n\n" + context_str[:600] + "...",
                "sources": sources,
                "is_rag": True,
                "model_used": "retrieval_fallback"
            }
        except Exception as ex:
            return {
                "answer": f"Error generating answer: {str(ex)}",
                "sources": sources,
                "is_rag": True,
                "model_used": "error_fallback"
            }

# Singleton instance
rag_engine = RAGEngine()

def query_rag(query_text: str, top_k: int = 5):
    return rag_engine.generate_rag_response(query_text, top_k=top_k)

if __name__ == "__main__":
    test_q = "What are the voltage ratings and standards specified for electric equipment?"
    print(f"\n[CLI TEST] Query: {test_q}\n")
    res = query_rag(test_q)
    print("--- RAG RESPONSE ---")
    print(res["answer"])
    print("\n--- SOURCES ---")
    for s in res["sources"]:
        print(f"Page {s['page_number']} | Distance: {s['distance']}")