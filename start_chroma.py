"""
SupportAI - ChromaDB Server Startup Script
Starts ChromaDB on localhost:8000 to serve as the vector database.
"""
import subprocess
import sys
import os

def start_server():
    """Start ChromaDB HTTP server using virtual environment."""
    host = os.environ.get("CHROMA_HOST", "127.0.0.1")
    port = int(os.environ.get("CHROMA_PORT", "8000"))
    
    # Calculate path inside virtual environment
    project_dir = os.path.dirname(os.path.abspath(__file__))
    venv_python = os.path.join(project_dir, "venv", "Scripts", "python.exe")
    data_path = os.path.join(project_dir, "chroma_data")

    os.makedirs(data_path, exist_ok=True)
    print(f"🗄️  ChromaDB data path: {data_path}")
    print(f"🚀 Starting ChromaDB server on http://{host}:{port} using venv...")
    print("   Press Ctrl+C to stop\n")

    try:
        # Run ChromaDB CLI using the virtual environment's python interpreter and the rust bindings entrypoint
        cmd = [
            venv_python, "-c",
            "import chromadb_rust_bindings; chromadb_rust_bindings.cli(['chroma', 'run', '--path', " + repr(data_path) + ", '--host', " + repr(host) + ", '--port', " + repr(str(port)) + "])"
        ]
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\n👋 ChromaDB server stopped")
    except Exception as e:
        print(f"Error starting ChromaDB: {e}")

if __name__ == "__main__":
    start_server()
