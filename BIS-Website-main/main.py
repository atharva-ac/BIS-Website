import os
import sys
from typing import Optional, List, Dict
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

# Import our RAG Engine and Ingestion pipeline
from app import query_rag, rag_engine
from ingest import build_and_save_vector_store, COLLECTION_NAME, CHROMA_DB_DIR, PDF_PATH

# Force UTF-8 stdout
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

app = FastAPI(
    title="Bureau of Indian Standards (BIS) RAG API",
    description="Strict RAG-based backend for Indian Standard compliance documentation (Electric Equipments.pdf)",
    version="1.0.0"
)

# Enable CORS for cross-origin frontend requests (including file:// protocol)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class HistoryTurn(BaseModel):
    role: str = Field(..., description="'user' or 'ai'")
    text: str = Field(..., max_length=4000)

class QueryRequest(BaseModel):
    question: str = Field(
        ..., min_length=1, max_length=2000,
        description="The query string to search in the BIS document",
        json_schema_extra={"example": "What standard applies to plugs and sockets?"}
    )
    top_k: Optional[int] = Field(default=5, ge=1, le=10, description="Number of top context chunks to retrieve")
    history: Optional[List[HistoryTurn]] = Field(
        default=None,
        description="Recent conversation turns (most recent last), used only to help resolve follow-up references such as 'it' or 'that standard'."
    )

class SourceCitation(BaseModel):
    chunk_id: int
    page_number: int
    distance: float
    content: str

class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    is_rag: bool = True
    model_used: Optional[str] = "llama3.2"

class HealthResponse(BaseModel):
    status: str
    database_connected: bool
    total_indexed_chunks: int
    pdf_source: str
    embedding_model: str

# API Routes
@app.get("/health", response_model=HealthResponse, tags=["Status"])
@app.get("/api/health", response_model=HealthResponse, tags=["Status"])
def health_check():
    db_connected = rag_engine.collection is not None
    chunk_count = rag_engine.collection.count() if db_connected else 0
    return {
        "status": "online" if db_connected else "degraded",
        "database_connected": db_connected,
        "total_indexed_chunks": chunk_count,
        "pdf_source": os.path.basename(PDF_PATH),
        "embedding_model": "all-MiniLM-L6-v2 (Chroma Default)"
    }

@app.get("/api/info", tags=["Information"])
def get_document_info():
    db_connected = rag_engine.collection is not None
    chunk_count = rag_engine.collection.count() if db_connected else 0
    return {
        "document_name": "Electric Equipments.pdf",
        "standard_authority": "Bureau of Indian Standards (BIS)",
        "total_pages": 69,
        "total_chunks": chunk_count,
        "collection_name": COLLECTION_NAME,
        "db_directory": CHROMA_DB_DIR
    }

@app.post("/api/query", response_model=QueryResponse, tags=["RAG Search & Chat"])
@app.post("/api/chat", response_model=QueryResponse, tags=["RAG Search & Chat"])
def query_bis_document(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        history = [turn.model_dump() for turn in request.history] if request.history else None
        result = query_rag(query_text=request.question, top_k=request.top_k, history=history)
        return result
    except Exception as e:
        print(f"[API ERROR] /api/query failed: {e}")
        raise HTTPException(status_code=500, detail="RAG processing failed. Please try again shortly.")

def _reingest_and_refresh():
    """Rebuild the vector store, then refresh the live RAGEngine's collection handle.
    Without the refresh step, the running server's cached collection object still
    points at the deleted collection's UUID and every query after this fails with
    a 500 (Collection ... does not exist) until the process is restarted.

    build_and_save_vector_store() only deletes the existing collection after the
    PDF has been successfully loaded and chunked, so a bad PDF fails before any
    data is touched - but since this runs as a fire-and-forget background task,
    there is no HTTP response left to report that failure on. Log it clearly so
    it's at least visible in server logs instead of failing silently."""
    try:
        build_and_save_vector_store()
        rag_engine.refresh_collection()
    except Exception as e:
        print(f"[INGEST FAILED] Re-ingestion did not complete: {e}. Existing index (if any) remains active.")

@app.post("/api/ingest", tags=["Ingestion"])
def trigger_reingestion(background_tasks: BackgroundTasks):
    """Triggers background re-indexing of the PDF document."""
    try:
        background_tasks.add_task(_reingest_and_refresh)
        return {"message": "Re-ingestion started in background", "status": "processing"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start ingestion: {str(e)}")

# Frontend Static File Serving
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/", include_in_schema=False)
    def read_root():
        index_file = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "BIS RAG API is running. Access /docs for API documentation."}

    @app.get("/{page_name}.html", include_in_schema=False)
    def read_html_page(page_name: str):
        page_file = os.path.join(FRONTEND_DIR, f"{page_name}.html")
        if os.path.exists(page_file):
            return FileResponse(page_file)
        raise HTTPException(status_code=404, detail="Page not found")

    # Serve the relative CSS and JavaScript paths used by the HTML pages.
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8080, reload=True)
