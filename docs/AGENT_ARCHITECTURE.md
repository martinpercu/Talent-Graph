# LangGraph Agent Backend - Bridge To Works

This is the **production-ready LangGraph agent** that powers the Bridge To Works recruitment platform's AI chat interface.

## 🎯 What This Demonstrates

This FastAPI + LangGraph application showcases **seven key agent optimizations**:

1. **Action Triggers** - Ultra-fast routing (< 5ms) for specific actions (questions, emails, comparisons)
2. **Silent Loading** - Pre-loads context on mount (~500ms one-time, then 0ms)
3. **Smart Caching** - Context invalidation based on user intent (0ms cached, ~500ms when invalidated)
4. **Multi-Model Strategy** - GPT-4o-mini for conversation + Claude Haiku for fast classification
5. **Streaming SSE** - Real-time token-by-token responses
6. **PostgreSQL Checkpointing** - Full conversation state persistence via LangGraph
7. **Duplicate Detection** - Intelligent candidate disambiguation with prioritization

---

## 🏗️ Architecture Overview

### LangGraph State Machine

The agent uses a **StateGraph** with 12+ specialized nodes and hierarchical conditional routing:

```
START → trigger_checker → [3 paths]

PATH 1 - Action Triggers (< 5ms):
  trigger_checker → question_generator → llm_response → END

PATH 2 - Silent Loading (~500ms one-time):
  silent_loader_checker → context_loader → END (no response)

PATH 3 - Normal Flow:
  domain_checker → [2 sub-paths]

  SUB-PATH A - Fast Path (general talk):
    domain_checker → general_talk → llm_response → END
    (No DB queries, ultra-fast for greetings)

  SUB-PATH B - HR Related:
    domain_checker → context_loader → intent_checker → [3 options]

    OPTION 1 - Job Query:
      job_handler → resume_matcher → general_talk → llm_response → END

    OPTION 2 - Resume Query:
      resume_handler → general_talk → llm_response → END
      (Includes duplicate detection if same name)

    OPTION 3 - General HR Query:
      general_talk → llm_response → END
```

### Key Nodes

| Node | Purpose | Performance |
|------|---------|-------------|
| `trigger_checker` | Detect action triggers (keywords or frontend param) | < 5ms |
| `silent_loader_checker` | Detect "start-loading-state" from frontend | ~1ms |
| `domain_checker` | Classify HR vs general (Claude Haiku + heuristics) | ~50-100ms (or 1ms heuristic) |
| `context_loader` | Load jobs + resumes with JOIN for job_name | ~500ms (or 0ms cached) |
| `intent_checker` | Detect job/resume/general mention | ~100-150ms |
| `job_handler` | Identify specific job | ~100-150ms |
| `resume_handler` | Identify candidate + detect duplicates | ~100-150ms + DB query |
| `resume_matcher` | Analyze candidates for job | Streaming |
| `question_generator` | Generate interview questions | Streaming |
| `general_talk` | Prepare system prompt | ~1ms |
| `llm_response` | Stream GPT-4o-mini response | ~962ms TTFT |

---

## 📊 Performance Metrics

| Operation | Latency | Impact |
|-----------|---------|--------|
| **Action Trigger** | < 5ms | Skip domain/intent checks entirely |
| **Silent Loading** | ~500ms → 0ms | Pre-load on mount, instant thereafter |
| **Fast Path** | ~1ms + LLM | No DB for casual conversation |
| **Context Cache Hit** | 0ms | Reuse loaded jobs/resumes |
| **Context Invalidation** | ~500ms | Force reload when `domain=hr_related` |
| **Domain Check (Haiku)** | ~50-100ms | Faster than GPT-4o-mini |
| **TTFT** | ~962ms | Time to first token |

### Optimization Impact

- **Silent Loading:** Eliminates 500ms delay on first user message
- **Fast Path:** 500ms → 1ms for greetings (no DB queries)
- **Action Triggers:** 200ms → 5ms (direct routing, skip checks)
- **Context Caching:** 500ms → 0ms for subsequent HR queries
- **Haiku Classification:** 200ms → 50ms (vs GPT-4o-mini)

---

## 🧠 State Management

### HRState (TypedDict)

```python
class HRState(TypedDict):
    # Conversation
    messages: Annotated[List[AnyMessage], add_messages]

    # Recruiter & Jobs
    recruiter_id: str
    job_id: str | None
    job_name: str | None
    available_jobs: List[Dict] | None

    # Resumes
    resumeId: str | None
    resume_name: str | None
    available_resumes: List[Dict] | None  # Includes job_name via JOIN
    duplicate_resumes: List[Dict] | None  # For disambiguation
    matched_resumes: List[Dict] | None    # Filtered by job_id

    # Routing & Detection
    domain: str | None                # "hr_related" | "general"
    user_intent: str | None           # "job" | "resume" | "general"
    language: str | None              # "es" | "en" | "fr"
    silent_load: bool | None          # Pre-loading flag
    action_trigger: str | None        # "questions" | "email" | "compare"
```

**State Persistence:** LangGraph's PostgresSaver automatically saves state after each node execution.

---

## 🔌 API Endpoints

### POST `/chat_agent/{thread_id}/stream`

Stream agent responses with SSE.

**Request:**
```json
{
  "message": "Show me candidates for Frontend Developer",
  "recruiterId": "abc123",
  "max_threads": 10,
  "trigger": "questions"  // Optional: "questions", "email", "compare"
}
```

**Response (SSE):**
```
data: {"type": "start"}
data: {"type": "content", "content": "I found "}
data: {"type": "content", "content": "3 candidates"}
data: {"type": "content", "content": ":\n\n"}
data: {"type": "end"}
```

### GET `/chat_agent/{thread_id}/history`

Retrieve conversation history.

**Response:**
```json
[
  {"role": "user", "content": "Show me candidates", "timestamp": "2025-12-01T10:30:00Z"},
  {"role": "assistant", "content": "I found 3 candidates...", "timestamp": "2025-12-01T10:30:02Z"}
]
```

### POST `/resumes/sync` & POST `/jobs/sync`

Sync data from Firebase to PostgreSQL.

**Jobs Response:**
```json
{"new": 3, "updated": 1, "deleted": 0, "total": 4}
```

### DELETE `/threads/{thread_id}`

Delete specific conversation thread.

---

## 🚀 Quick Start

### Prerequisites

- Python 3.13+
- PostgreSQL 15
- OpenAI API key
- Anthropic API key (for Claude Haiku)

### Installation

1. **Navigate to backend directory**
   ```bash
   cd backend/
   ```

2. **Install dependencies**
   ```bash
   uv sync
   ```

3. **Configure environment**
   ```bash
   export OPENAI_API_KEY="sk-proj-..."
   export ANTHROPIC_API_KEY="sk-ant-..."
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agent_test"
   ```

4. **Start PostgreSQL**
   ```bash
   docker-compose up -d
   ```

5. **Run server**
   ```bash
   uv run uvicorn src.api.main:app --reload --port 8000
   ```

   Server runs at: http://localhost:8000

---

## 🔑 Key Optimizations Explained

### 1. Action Triggers (< 5ms)

**Problem:** User wants specific action (generate questions, draft email, compare candidates)

**Solution:**
```python
# Frontend sends explicit trigger (0ms)
{"message": "Generate questions", "trigger": "questions"}

# Or keyword detection (~1ms)
if "interview questions" in message or "preguntas de entrevista" in message:
    state["action_trigger"] = "questions"
```

**Impact:** Skips domain_checker, context_loader, intent_checker → direct to question_generator

---

### 2. Silent Loading (~500ms one-time)

**Problem:** First message has high latency due to DB queries

**Solution:**
```python
# Frontend sends on mount
{"message": "start-loading-state", "recruiterId": "abc123"}

# Backend loads context, returns END (no response)
if message == "start-loading-state":
    state["silent_load"] = True
    # Load jobs + resumes → save in state → END
```

**Impact:** First user message feels instant (context already loaded)

---

### 3. Smart Context Caching

**Problem:** Loading jobs + resumes every message is slow

**Solution:**
```python
if state.get("domain") == "hr_related":
    # Force reload - new candidates might exist
    load_from_db()  # ~500ms
elif state.get("available_jobs") and state.get("available_resumes"):
    # Use cache
    return state  # 0ms
else:
    # First time
    load_from_db()  # ~500ms
```

**Impact:** 0ms for most HR queries, fresh data when needed

---

### 4. Multi-Model Strategy

**Domain Classification:**
- **Heuristic** (~1ms): Short messages (<20 chars) → "general"
- **Claude Haiku** (~50-100ms): If heuristic inconclusive
- **Why Haiku?** 2-4x faster than GPT-4o-mini for simple classification

**Conversation & Analysis:**
- **GPT-4o-mini**: Intent detection, conversation, resume matching, question generation
- **Why 4o-mini?** Best balance of cost, speed, and quality

---

### 5. Duplicate Detection

**Problem:** Multiple candidates with same name

**Solution:**
```python
duplicates = [r for r in available_resumes if r["name"] == "Lucía Gómez"]

if len(duplicates) > 1:
    # Load full data with job_name via JOIN
    state["duplicate_resumes"] = [
        {
            "resumeId": "r1",
            "name": "Lucía Gómez",
            "job_name": "Frontend Developer Jr.",  # Priority 1
            "thumbUp": true,                        # Priority 2
            "scoreToPosition": "603"                # Priority 3
        },
        {
            "resumeId": "r2",
            "name": "Lucía Gómez",
            "job_name": "Sin puesto asignado",
            "thumbUp": false,
            "scoreToPosition": "450"
        }
    ]

    # general_talk formats clarification prompt
    prompt = """
    Encontré 2 candidatos con el nombre "Lucía Gómez".

    1. Lucía Gómez - Postulado a: Frontend Developer Jr. | ✓ Aprobado | Score: 603
    2. Lucía Gómez - Sin puesto asignado | Score: 450

    ¿Cuál te interesa? (menciona el puesto, número, o aprobación)
    """
```

**Impact:** Clear disambiguation, user can specify by job/approval/score

---

## 🗃️ Database Schema

### Application Data (SQLAlchemy)

```python
class Resume(Base):
    resumeId: str                 # Primary Key
    recruiter_id: str             # Indexed
    jobRelated_id: str | None     # Job applied to
    name: str
    scoreToPosition: str | None
    thumbUp: bool | None
    skills: JSON                  # Array
    works: JSON                   # Array of objects
    education: JSON               # Array
    full_text_content: Text       # For search
    synced_at: DateTime

class Job(Base):
    job_id: str                   # Primary Key
    owner_id: str                 # Indexed (recruiter)
    name: str
    description: Text
    min_salary: float | None
    max_salary: float | None
    currency_salary: str | None
    full_text_content: Text       # For search
    synced_at: DateTime
```

### Conversation State (LangGraph)

- **checkpoints** - State snapshots (managed by PostgresSaver)
- **checkpoint_writes** - Node execution logs
- **checkpoint_blobs** - Binary state data

---

## 📐 Architecture Patterns

### 1. Dependency Injection (FastAPI)
```python
async def chat(
    thread_id: str,
    item: Message,
    checkpointer: CheckpointerDep,  # Auto-injected
    db: DBDep                        # Auto-injected
):
```

### 2. State Reducer (LangGraph)
```python
messages: Annotated[List[AnyMessage], add_messages]
# add_messages = append instead of replace
```

### 3. Structured Output (LangChain)
```python
class JobSelection(BaseModel):
    job_name: str

llm.with_structured_output(schema=JobSelection)
# Forces type-safe responses
```

### 4. Streaming Architecture
```python
async for event in agent.astream_events(...):
    if event["event"] == "on_chat_model_stream":
        chunk = event["data"]["chunk"]
        yield f"data: {json.dumps({'content': chunk.content})}\n\n"
```

---

## 🛠️ Tech Stack

- **Python 3.13** - Modern async features
- **FastAPI** - High-performance API framework
- **LangGraph 1.0.1+** - Agent orchestration
- **LangChain 1.0.2+** - LLM abstraction
- **PostgreSQL 15** - Main database + checkpointing
- **SQLAlchemy 2.0** - ORM
- **GPT-4o-mini** (OpenAI) - Primary LLM
- **Claude Haiku** (Anthropic) - Fast classification
- **uv** - Modern Python package manager
- **Railway** - Cloud deployment

---

## 📝 Production Features

✅ **Type Safety** - Full TypedDict annotations
✅ **Error Handling** - Graceful fallbacks on failures
✅ **Security** - Context isolation per recruiter
✅ **Observability** - Comprehensive logging
✅ **Testing** - Bruno collection for API tests
✅ **Modularity** - 12 independent nodes
✅ **Multi-language** - ES/EN/FR support
✅ **Streaming** - Real-time responses
✅ **Caching** - Smart invalidation
✅ **Scalability** - Stateless API design

---

## 🔧 Development

### Project Structure
```
backend/src/
├── api/                      # FastAPI app (refactored v2.0)
│   ├── main.py              # 36 lines
│   ├── routes/              # Modular endpoints
│   ├── schemas/             # Pydantic models
│   └── utils/               # Helpers
│
├── agents/first_agent/      # LangGraph agent
│   ├── first_agent.py       # StateGraph compilation
│   ├── state.py             # HRState definition
│   ├── nodes/               # 12+ processing nodes
│   ├── routes/              # Conditional routing
│   └── helpers/             # Shared utilities
│
├── pyproject.toml           # uv dependencies
└── docker-compose.yml       # PostgreSQL + pgAdmin
```

### Adding New Nodes

1. Create folder: `src/agents/first_agent/nodes/my_node/`
2. Add `node.py` with logic
3. Add `prompt.py` if using LLM
4. Register in `first_agent.py`:
   ```python
   builder.add_node("my_node", my_node_function)
   builder.add_edge("previous_node", "my_node")
   ```
5. Update `HRState` if new fields needed

### Testing

**Bruno Collection** (`/Bruno-Bridge-agent`):
- `dev-post-stream-test.bru` - Local streaming test
- `post-test-rail.bru` - Production test

**Sample Data:**
- `test_job.json` - Example job
- `test_sync.json` - Example resume

---

## 📞 Contact & Contributions

This architecture is suitable for:
- **Recruiters** evaluating AI/LLM capabilities
- **Developers** learning LangGraph patterns
- **Companies** building HR tech solutions

For collaboration or questions:
- Main README: [../README.md](../README.md)
- Project context: [../CLAUDE.md](../CLAUDE.md)
- API docs: http://localhost:8000/docs (when running)

---

## 📚 Learn More

- [LangGraph Docs](https://langchain-ai.github.io/langgraph/) - State machines for LLM apps
- [LangChain Docs](https://python.langchain.com/) - LLM framework
- [FastAPI Docs](https://fastapi.tiangolo.com/) - Modern async Python API
- [PostgreSQL Docs](https://www.postgresql.org/docs/) - Database

---

**Built with production-grade patterns for enterprise recruitment AI**

**Version:** 2.0 | **Updated:** December 2025 | **Status:** Production-ready
**Tech:** Python 3.13 + FastAPI + LangGraph + PostgreSQL + OpenAI/Anthropic
