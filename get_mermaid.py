import zlib
import base64
import urllib.parse
import json

graph = \"\"\"graph TD
    %% Frontend Layer
    subgraph Frontend [1. Client - Next.js]
        A1[Vidya - Templates]
        A2[Granth - Library]
        A3[Rachna - Generator]
        A4[Itihas - History]
        LS[(Browser Local Storage)]
        A1 -.-> LS
        A4 -.-> LS
    end

    %% Backend Layer
    subgraph Backend [2. Backend - FastAPI]
        B1(FastAPI Routers)
        B2(Document Processor)
        B3(Agentic Orchestrator)
        DB1[(SQLite DB)]
        DB2[(FAISS Vector Store)]
        LLM{LLM Factory}
    end

    %% External APIs
    subgraph External [3. LLM Providers]
        C1[Groq API]
        C2[Google Gemini API]
        C3[Ollama Local]
    end

    %% Connections
    A2 -- Upload PDF --> B1
    A3 -- Generate Request --> B1
    B1 -- Ingest Document --> B2
    B2 -- Store Metadata --> DB1
    B2 -- Store Embeddings --> DB2
    B1 -- Process Exam --> B3
    B3 -- Retrieve Context --> DB2
    B3 -- Generate Chunks --> LLM
    LLM -- Parallel Cloud Req --> C1
    LLM -- Parallel Cloud Req --> C2
    LLM -- Sequential Local Req --> C3

    classDef frontend fill:#1e293b,stroke:#ea580c,stroke-width:2px,color:#f8fafc;
    classDef backend fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#f8fafc;
    classDef db fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#f8fafc;
    classDef api fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#f8fafc;
    class A1,A2,A3,A4,LS frontend;
    class B1,B2,B3,LLM backend;
    class DB1,DB2 db;
    class C1,C2,C3 api;
\"\"\"

j = json.dumps({"code": graph, "mermaid": {"theme": "default"}})
compressed = zlib.compress(j.encode('utf-8'), 9)
encoded = base64.urlsafe_b64encode(compressed).decode('ascii')
print(f"https://mermaid.ink/svg/pako:{encoded}")
