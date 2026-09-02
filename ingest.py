import os
import sys
from pathlib import Path

# Force UTF-8 stdout for Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

# Path configurations
PDF_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Electric Equipments.pdf")
CHROMA_DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bis_vector_db")
COLLECTION_NAME = "bis_documents"

def build_and_save_vector_store():
    if not os.path.exists(PDF_PATH):
        print(f"[ERROR] Could not find PDF at '{PDF_PATH}'")
        return

    print(f"[STEP 1] Loading PDF from '{PDF_PATH}'...")
    loader = PyPDFLoader(PDF_PATH)
    raw_documents = loader.load()
    print(f"[SUCCESS] Loaded {len(raw_documents)} pages.")

    print("[STEP 2] Chunking document into text segments...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=700,
        chunk_overlap=150,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    chunks = text_splitter.split_documents(raw_documents)
    
    # Enhance chunk metadata
    for idx, chunk in enumerate(chunks):
        chunk.metadata["chunk_id"] = idx
        chunk.metadata["source"] = "Electric Equipments.pdf"
        page_num = chunk.metadata.get("page", 0)
        chunk.metadata["page_number"] = page_num + 1 if isinstance(page_num, int) else page_num

    print(f"[SUCCESS] Created {len(chunks)} text chunks.")

    print(f"[STEP 3] Initializing Persistent Chroma DB at '{CHROMA_DB_DIR}'...")
    client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
    
    # Remove existing collection if rebuilding
    try:
        client.delete_collection(name=COLLECTION_NAME)
        print(f"[CLEANUP] Removed existing collection '{COLLECTION_NAME}'")
    except Exception:
        pass

    ef = DefaultEmbeddingFunction()
    collection = client.create_collection(
        name=COLLECTION_NAME,
        embedding_function=ef
    )

    print("[STEP 4] Storing embeddings and text chunks into Chroma vector store...")
    documents = [c.page_content for c in chunks]
    metadatas = [c.metadata for c in chunks]
    ids = [f"chunk_{i}" for i in range(len(chunks))]

    # Add in batches
    batch_size = 100
    for i in range(0, len(chunks), batch_size):
        end_idx = min(i + batch_size, len(chunks))
        collection.add(
            documents=documents[i:end_idx],
            metadatas=metadatas[i:end_idx],
            ids=ids[i:end_idx]
        )
        print(f"   Indexed chunks {i+1} to {end_idx}...")

    print(f"[FINISHED] Ingestion Complete! Total indexed chunks: {collection.count()}")

if __name__ == "__main__":
    build_and_save_vector_store()