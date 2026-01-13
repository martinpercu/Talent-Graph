# LangGraph Agent Backend - Talent-Graph

This is the **production-ready LangGraph agent** that powers the TalentGraph recruitment platform's AI chat interface.

## 🎯 What This Demonstrates (v3.0)

This FastAPI + LangGraph application showcases **10 key agent optimizations**:

1. **Multi-Level Detection System** ✨ NEW - 7 layers of ultra-fast detection nodes (< 5ms each)
2. **Fast Path v3.0** ✨ NEW - context_resolver → talk_with_state (< 10ms, skips domain_checker + context_loader)
3. **Conflict Handling** ✨ NEW - candidate_detector + pending_action_resolver for intelligent disambiguation
4. **Action Triggers with Selection Resolver** - Ultra-fast routing (< 5ms) with fuzzy matching
5. **Context Resolver** - Detects candidate context BEFORE domain routing, enables early termination
6. **Context Enricher** - Universal enrichment in ALL paths before LLM (~0-6ms)
7. **Silent Loading** - Pre-loads context on mount (~500ms one-time, then 0ms cached)
8. **Fast Path General** - General conversation without DB queries (~1ms + LLM)
9. **Smart Caching** - Context invalidation based on domain (domain=hr_related forces reload)
10. **PostgreSQL Checkpointing** - Full conversation state persistence via LangGraph

---

## 🏗️ Architecture Overview (v3.0)

### LangGraph State Machine

The agent uses a **StateGraph** with **28 specialized nodes** organized in **5 categories** and **14 conditional routes**:

```
START
  ↓
state_logger_start (LOG INICIAL)
  ↓
trigger_checker (DETECTA trigger: questions/email/compare)
  ↓
post_trigger_route
  ├─→ (Si hay trigger) selection_resolver
  │     ↓
  │   trigger_route
  │     ├─→ question_generator → action_generator_route → llm_response/direct_response → state_logger_end → END
  │     ├─→ email_generator → action_generator_route → llm_response/direct_response → state_logger_end → END
  │     └─→ comparison_generator → direct_response → state_logger_end → END
  │
  └─→ (Sin trigger) silent_load_detector ✨ NEW
        ↓
      silent_load_detector_route ✨ NEW
        ├─→ (silent_load=True) silent_loader_checker → silent_loader_route → context_loader → END
        │
        └─→ (silent_load=False) pending_action_resolver ✨ NEW (resuelve pending actions)
              ↓
            job_mention_checker ✨ NEW (DETECTA job específico con fuzzy matching)
              ↓
            job_mention_route ✨ NEW
              ├─→ (has_job_mention=True) candidate_filter ✨ NEW → candidate_detector
              │                                              ↓
              │                                            candidate_detector_route ✨ NEW
              │                                              ├─→ (conflicto) direct_response → state_logger_end → END
              │                                              ├─→ (job_id existe) context_resolver
              │                                              └─→ (no job_id) job_list_checker
              │
              └─→ (has_job_mention=False) candidate_detector ✨ NEW (detecta candidatos + conflictos)
                    ↓
                  candidate_detector_route ✨ NEW
                    ├─→ (conflicto) direct_response → state_logger_end → END
                    ├─→ (job_id existe) context_resolver
                    └─→ (no job_id) job_list_checker ✨ NEW (detecta si pide lista)
                          ↓
                        job_list_route ✨ NEW
                          ├─→ (wants_job_list=True o resumeId existe) context_resolver
                          └─→ (wants_job_list=False) domain_checker

                  CONTEXT_RESOLVER (detecta CANDIDATOS)
                        ↓
                  context_resolver_route
                    ├─→ (pending_action) llm_response → state_logger_end → END (aclaración)
                    ├─→ (job_id o matched_resumes) talk_with_state ✨ NEW (FAST PATH v3.0) → llm_response → state_logger_end → END
                    └─→ (sin contexto) domain_checker

                  DOMAIN_CHECKER + NORMAL PATH
                        ↓
                  domain_route
                    ├─→ (hr_related) context_loader
                    │                   ↓
                    │                context_loader_route
                    │                ├─→ (silent_load=True) END
                    │                └─→ (silent_load=False) intent_checker
                    │                                           ↓
                    │                                       intent_route
                    │                                       ├─→ (job) job_handler → resume_matcher → context_enricher
                    │                                       ├─→ (resume) resume_handler → context_enricher
                    │                                       └─→ (general) context_enricher
                    │                                           ↓
                    │                                       general_talk → llm_response
                    │
                    └─→ (general/FAST PATH) context_enricher → general_talk → llm_response

state_logger_end (LOG FINAL)
  ↓
END
```

### 5 Key Agent Flows

#### 1️⃣ Action Trigger Path (< 5ms detection + LLM)
- **Frontend sends explicit trigger** OR heuristic detection
- **Supported triggers:** `questions`, `email`, `compare`
- **Performance:** < 5ms (0ms frontend explicit, ~1ms heuristic)
- **Example:** "Generate interview questions for María López"

#### 2️⃣ Silent Loading Path (~500ms one-time)
- **Special message:** "start-loading-state"
- **Flow:** silent_load_detector → silent_loader_checker → context_loader → END
- **Purpose:** Pre-loads jobs + resumes without user response
- **Performance:** ~500ms one-time, then 0ms cached

#### 3️⃣ Fast Path v3.0 - Early Detection ✨ NEW (< 10ms + LLM)
- **Most important optimization in v3.0**
- **Flow:** context_resolver → talk_with_state → llm_response → END
- **Trigger:** When job_id or matched_resumes are detected
- **What it skips:** domain_checker + context_loader (~500ms saved!)
- **Performance:** < 10ms to reach LLM
- **Example:** "Show me candidates for Frontend Developer" (after job detected by job_mention_checker)

#### 4️⃣ Fast Path - General (~1ms + LLM)
- **Casual conversation** (domain=general)
- **Flow:** domain_checker → context_enricher → general_talk → llm_response
- **Performance:** ~1ms + LLM (no DB queries)
- **Example:** "Hello", "How are you?"

#### 5️⃣ Complete HR Path (~0-500ms + analysis)
- **HR-related questions** with full context loading
- **Flow:** domain_checker → context_loader → intent_checker → job/resume handlers
- **All paths** go through context_enricher before general_talk
- **Performance:** ~0-500ms (0ms cached, ~500ms when invalidated) + LLM

---

## 📊 Performance Metrics (v3.0)

| Operation | Latency | Description |
|-----------|---------|-------------|
| **Action Trigger Detection** | < 5ms | Frontend explicit (0ms) or heuristic (~1ms) |
| **Silent Load Detection** ✨ | < 1ms | Detects "start-loading-state" command |
| **Pending Action Resolver** ✨ | ~1-5ms | Resolves conflicts from previous turn |
| **Job Mention Checker** ✨ | ~1-5ms | Fuzzy matching for job detection (30%) |
| **Candidate Detector** ✨ | ~1-3ms | Fuzzy matching + conflict detection |
| **Job List Checker** ✨ | < 1ms | Detects list request keywords |
| **Candidate Filter** ✨ | ~1-3ms | Filters candidates by job + keywords |
| **Talk With State** ✨ | < 5ms | Fast path v3.0 prompt preparation |
| **Fast Path v3.0** ✨ | **< 10ms + LLM** | Skips domain_checker + context_loader |
| **Silent Loading** | ~500ms → 0ms | One-time pre-load, then cached |
| **Context Resolver** | ~3-50ms | Fuzzy matching for candidate context |
| **Context Enricher** | ~0-6ms | Enrichment in all paths |
| **Fast Path (General)** | ~1ms + LLM | No DB queries for casual conversation |
| **HR Path (First)** | ~500ms + LLM | Context load with JOINs + analysis |
| **HR Path (Cached)** | 0ms + LLM | Cache hit - no DB queries |
| **HR Path (Invalidated)** | ~500ms + LLM | Force reload when domain=hr_related |
| **TTFT** | ~962ms | Time to first token from GPT-4o-mini |
| **Total LLM** | ~2275ms | Complete response generation |

### Optimization Impact (v3.0)

- **Fast Path v3.0:** ~500ms → < 10ms (skips domain_checker + context_loader)
- **Multi-Level Detection:** 7 layers, < 5ms each (total ~7-35ms max)
- **Conflict Handling:** Prevents ambiguous queries from reaching LLM
- **Action Triggers:** 200ms → 5ms (skip domain/intent checks)
- **Silent Loading:** 500ms → 0ms (pre-load eliminates first message delay)
- **Fast Path General:** 500ms → 1ms (no DB for casual conversation)
- **Context Caching:** 500ms → 0ms (reuse loaded data)
- **Context Enricher:** Universal enrichment (~0-6ms across all paths)

---

## 🧠 State Management (v3.0)

### HRState (TypedDict)

The agent's state includes:

```python
class HRState(TypedDict):
    messages: Annotated[List[AnyMessage], add_messages]

    # Recruiter
    recruiter_id: str

    # Jobs
    job_id: str | None
    job_name: str | None
    job_description: str | None
    job_data: dict | None
    available_jobs: List[Dict[str, str]] | None
    has_job_mention: bool | None  # ✨ NEW v3.0

    # Resumes
    resumeId: str | None
    resume_name: str | None
    resume_job_related_id: str | None
    resume_job_related_id_score: str | None
    available_resumes: List[Dict[str, Any]] | None  # Includes job_name via JOIN
    matched_resumes: List[Dict[str, Any]] | None
    matched_resumes_info: str | None
    duplicate_resumes: List[Dict[str, Any]] | None

    # Detection Flags ✨ NEW v3.0
    wants_job_list: bool | None
    has_candidate_mention: bool | None
    conflict_type: str | None  # "duplicate", "out_of_scope", "ambiguous"

    # Domain & Intent & Language
    domain: str | None  # "hr_related" | "general"
    user_intent: str | None  # "job" | "resume" | "general"
    language: str | None  # "es" | "en" | "fr"
    silent_load: bool | None

    # Action Triggers
    action_trigger: str | None  # "questions" | "email" | "compare" | None

    # Early Termination
    pending_action: str | None  # For context_resolver ambiguity
```

**Key Features v3.0:**
- `has_job_mention` - Flag from job_mention_checker
- `wants_job_list` - Flag from job_list_checker
- `has_candidate_mention` - Flag from candidate_detector
- `conflict_type` - Type of conflict detected (duplicate, out_of_scope, ambiguous)
- `add_messages` reducer appends messages (doesn't replace)
- `available_resumes` includes `job_name` from JOIN optimization
- `duplicate_resumes` for disambiguation (multiple candidates, same name)
- `pending_action` for early termination with clarification

---

## 🔧 Node Categories (28 Total in v3.0)

### 1️⃣ Entry & Logging (2 nodes)
- **state_logger_start** - Initial state logging with counts
- **state_logger_end** - Final state logging + metrics

### 2️⃣ Action Trigger System (6 nodes)
- **trigger_checker** - Detects action triggers (< 5ms)
  - Priority: Frontend explicit (0ms) → Heuristic keywords (~1ms)
  - Supports: ES/EN/FR keywords
- **selection_resolver** - Resolves job/candidate selection
  - Fuzzy matching (30% threshold)
  - Searches in user message if not in state
- **question_generator** - Generates interview questions
  - Loads complete resume data
  - Personalizes based on experience, skills, education
- **email_generator** - Generates personalized emails
  - Types: rejection, invitation, request_info, follow_up
  - Uses candidate + job context
- **comparison_generator** - Generates candidate comparisons
  - Deterministic format with structured data
  - Filters by job_id
- **direct_response** - Streams AIMessage without LLM
  - Pass-through for deterministic responses
  - Used by comparison_generator (always), conflict resolution

### 3️⃣ Multi-Level Detection System ✨ NEW (7 nodes in v3.0)
- **silent_load_detector** - Detects "start-loading-state" command
  - Keyword matching
  - < 1ms performance
- **pending_action_resolver** - Resolves pending actions from previous turn
  - Attempts resolution by: number, job, thumbup, score
  - Generates clarification if still ambiguous
  - ~1-5ms performance
- **job_mention_checker** - Detects mentioned jobs with fuzzy matching
  - Exact match → keyword match → fuzzy 30%
  - Sets `has_job_mention` flag
  - ~1-5ms performance
- **candidate_detector** - Detects candidates + conflicts
  - Fuzzy matching (30% threshold)
  - Detects: duplicates, out_of_scope, ambiguous
  - Sets `conflict_type` if conflict found
  - ~1-3ms performance
- **job_list_checker** - Detects if user requests job list
  - Keyword matching (ES/EN/FR)
  - Sets `wants_job_list` flag
  - < 1ms performance
- **candidate_filter** - Filters candidates by job + keywords
  - Filters matched_resumes by job_id
  - Keyword detection for candidate context
  - ~1-3ms performance
- **talk_with_state** ✨ **FAST PATH v3.0**
  - Prepares prompt with detected context
  - Skips domain_checker + context_loader
  - < 5ms performance
  - **Saves ~500ms** by skipping unnecessary nodes

### 4️⃣ Context Management (4 nodes)
- **silent_loader_checker** - Validates silent loading flag
- **context_resolver** - Detects candidate context BEFORE domain routing
  - Fuzzy matching for candidates (exact → fuzzy 30%)
  - Generates `pending_action` if ambiguous
  - Enables early termination OR fast path v3.0
  - ~3-50ms performance
- **context_loader** - Loads jobs + resumes from DB
  - JOIN optimization for job_name
  - Cache invalidation when domain=hr_related
  - Language detection (first load only)
  - ~0-500ms performance
- **context_enricher** - Enriches context in ALL paths
  - Detects additional mentions
  - Universal execution before general_talk
  - ~0-6ms performance

### 5️⃣ Intent & Domain Routing (9 nodes)
- **domain_checker** - HR vs general pre-filter
  - Heuristic (~1ms): Short messages without HR keywords → general
  - LLM (Claude Haiku ~50-100ms): If heuristic inconclusive
- **intent_checker** - Detects job/resume/general mention
  - GPT-4o-mini with structured output
  - ~100-150ms performance
- **job_handler** - Identifies specific job
  - Fuzzy matching with available_jobs
  - Falls back to list if no match
- **resume_handler** - Identifies candidate + duplicates
  - Searches by name with fuzzy matching
  - Loads duplicate_resumes if multiple found
- **resume_matcher** - Analyzes candidates for job
  - Filters by jobRelated_id == job_id
  - Streaming analysis
- **general_talk** - Prepares system prompts
  - Special handling for duplicates (priority: job → thumbUp → score)
  - Formats context with job_name for resumes
  - Multi-language prompts (ES/EN/FR)
- **llm_node** - Invokes LLM with streaming
  - GPT-4o-mini (temp=0.3)
  - Accumulates full content before AIMessage
  - Measures TTFT + total time

---

## 🛤️ Conditional Routes (14 Total in v3.0)

| Route | From Node | Logic | Destinations |
|-------|-----------|-------|--------------|
| **post_trigger_route** | trigger_checker | Has action_trigger? | selection_resolver / silent_load_detector |
| **trigger_route** | selection_resolver | Which trigger? | question_gen / email_gen / comparison_gen |
| **action_generator_route** | question/email_gen | Message type? | direct_response (AIMessage) / llm_response (SystemMessage) |
| **silent_load_detector_route** ✨ | silent_load_detector | Silent load? | silent_loader_checker / pending_action_resolver |
| **silent_loader_route** | silent_loader_checker | Validated? | context_loader / END |
| **job_mention_route** ✨ | job_mention_checker | Has job mention? | candidate_filter / candidate_detector |
| **candidate_detector_route** ✨ | candidate_detector | Conflict or context? | direct_response / context_resolver / job_list_checker |
| **job_list_route** ✨ | job_list_checker | Wants list or has resumeId? | context_resolver / domain_checker |
| **context_resolver_route** | context_resolver | Pending action or context? | llm_response / talk_with_state / domain_checker |
| **domain_route** | domain_checker | HR related? | context_loader / context_enricher |
| **context_loader_route** | context_loader | Silent load? | END / intent_checker |
| **intent_route** | intent_checker | Intent type? | job_handler / resume_handler / context_enricher |

---

## 🚀 API Endpoints

### Chat Endpoints

**POST /chat_agent/{thread_id}/stream** - Streaming SSE chat
```json
{
  "message": "Show me candidates for Frontend Developer",
  "recruiterId": "rec-123",
  "max_threads": 10,
  "trigger": "questions"  // Optional: "questions", "email", "compare"
}
```

**Response (SSE):**
```
data: {"type": "start"}
data: {"type": "content", "content": "I found"}
data: {"type": "content", "content": " 3 candidates"}
...
data: {"type": "end"}
```

**GET /chat_agent/{thread_id}/history** - Conversation history
- Returns only HumanMessage and AIMessage
- Filters empty messages

### Sync Endpoints

**POST /resumes/sync** - Bulk candidate sync
**POST /jobs/sync** - Bulk job sync

### Thread Management

**GET /threads?recruiterId=xxx** - List recruiter's threads
**DELETE /threads/{thread_id}** - Delete specific thread

---

## 💡 Key Design Patterns (v3.0)

### 1. Multi-Level Detection Pattern ✨ NEW
- **7 layers of detection** before reaching domain_checker
- Each layer < 5ms
- Total overhead: ~7-35ms max
- Benefits: Ultra-fast routing, conflict prevention, early termination

### 2. Fast Path v3.0 Pattern ✨ NEW
- **context_resolver → talk_with_state**
- Skips domain_checker + context_loader (~500ms saved)
- Activated when job_id or matched_resumes detected
- Reaches LLM in < 10ms

### 3. Conflict Handling Pattern ✨ NEW
- **candidate_detector** detects conflicts:
  - "duplicate": Multiple candidates with same name
  - "out_of_scope": Candidate not in current job context
  - "ambiguous": Unclear candidate reference
- **pending_action_resolver** attempts resolution
- **direct_response** if conflict persists

### 4. Early Termination Pattern
- **context_resolver** detects ambiguity → generates `pending_action` → llm_response → END
- Prevents unnecessary processing when clarification needed

### 5. Universal Enrichment Pattern
- **ALL paths** go through `context_enricher` before `general_talk`
- Ensures consistent context enrichment

### 6. Dual Response Pattern
- **action_generator_route** decides:
  - AIMessage → `direct_response` (deterministic, no LLM)
  - SystemMessage → `llm_response` (LLM processing)

### 7. Cache Invalidation Pattern
- **context_loader** checks `domain=hr_related`
- Forces cache reload to ensure fresh data
- 0ms cached → ~500ms when invalidated

### 8. Fuzzy Matching Pattern
- Used in: job_mention_checker, candidate_detector, job_handler, resume_handler
- Threshold: **30% similarity** for typo tolerance

---

## 🧪 Testing

### With Bruno (Recommended)

Collection available in `/Bruno-Bridge-agent`:
```bash
bruno open Bruno-Bridge-agent/
```

**Tests included:**
- `dev-post-stream-test.bru` - Local streaming
- `post-test-rail.bru` - Railway deployment

### With curl

**Streaming chat with job mention:**
```bash
curl -X POST http://localhost:8000/chat_agent/thread-123/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me candidates for Frontend Developer",
    "recruiterId": "rec-456"
  }'
```

**Response:** Fast Path v3.0 activates (< 10ms to LLM)

---

## 🏛️ Tech Stack

**Core:**
- Python 3.13
- FastAPI (async web framework)
- uv (package manager)

**AI/LLM:**
- LangGraph 1.0+ (agent orchestration)
- LangChain 1.0+ (LLM abstraction)
- OpenAI GPT-4o-mini (primary model)
- Anthropic Claude Haiku (fast classification)

**Database:**
- PostgreSQL 15
- SQLAlchemy 2.0 (ORM)
- psycopg3 (adapter)
- LangGraph PostgresSaver (checkpointing)

**Infrastructure:**
- Docker Compose (local dev)
- Railway (deployment)
- Nixpacks (build system)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.13+
- PostgreSQL 15+
- Docker (optional)

### Installation

1. **Install uv:**
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Clone and install:**
   ```bash
   git clone <repo>
   cd agent-back-bridgetoworks
   uv sync
   ```

3. **Configure .env:**
   ```env
   OPENAI_API_KEY=sk-proj-...
   ANTHROPIC_API_KEY=sk-ant-api03-...
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agent_test
   ```

4. **Start PostgreSQL:**
   ```bash
   docker-compose up -d
   ```

5. **Run server:**
   ```bash
   uv run fastapi dev src/api/main.py --port 8000
   ```

Server available at http://localhost:8000

---

## 📝 Production Features (v3.0)

✅ **28 Specialized Nodes** - Organized in 5 categories (9 new nodes in v3.0)
✅ **14 Conditional Routes** - Intelligent flow control (6 new routes in v3.0)
✅ **5 Key Agent Flows** - Action triggers, silent loading, fast path v3.0, fast path general, complete HR path
✅ **Multi-Level Detection** ✨ - 7 layers of ultra-fast detection (< 5ms each)
✅ **Fast Path v3.0** ✨ - < 10ms to LLM (skips domain + context_loader)
✅ **Conflict Handling** ✨ - candidate_detector + pending_action_resolver
✅ **Fuzzy Matching** - 30% threshold for typo tolerance
✅ **Early Termination** - Context resolver with pending_action
✅ **Universal Enrichment** - Context enricher in ALL paths
✅ **Direct Response** - Deterministic responses without LLM
✅ **Multi-Model Strategy** - GPT-4o-mini + Claude Haiku
✅ **Smart Caching** - Invalidation based on domain
✅ **PostgreSQL Checkpointing** - Full state persistence
✅ **SSE Streaming** - Real-time responses
✅ **Multi-language** - ES/EN/FR support
✅ **Duplicate Detection** - Intelligent disambiguation

---

## 🤝 Contributing

This project demonstrates advanced LangGraph patterns for production AI agents. Key areas for improvement:

1. **Vector Search** - Semantic candidate search with embeddings
2. **Workflow Agents** - Multi-step interview scheduling
3. **Tool Integration** - Calendar APIs, email sending
4. **Analytics** - Recruitment metrics and insights

**For recruiters viewing this:**
This agent showcases production-ready patterns including multi-level detection, conflict handling, performance optimization (< 10ms fast path v3.0), and robust error handling - all crucial for real-world AI applications.

---

**Last updated:** 2026-01-13
**Version:** 3.0.0
**Backend Repository:** https://github.com/your-org/agent-back-bridgetoworks
**Contact:** For questions about this architecture, reach out via GitHub issues.
