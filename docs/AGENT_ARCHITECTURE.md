# LangGraph Agent Backend - Talent-Graph (v3.6)

This is the **production-ready LangGraph agent** (v3.6, February 2026) that powers the  TalentGraph recruitment platform's AI chat interface.

## 🎯 What This Demonstrates (v3.6)

This FastAPI + LangGraph application showcases **14 key agent optimizations**:

1. **Multi-Level Detection System** - 8 layers of ultra-fast detection nodes (< 5ms each)
2. **Fast Path v3.0** - context_resolver → talk_with_state (< 10ms, skips domain_checker + context_loader)
3. **Fast Path v3.5** - Job description / Job+Candidates / Full candidate list (NO LLM)
4. **Conflict Handling** - candidate_detector + pending_action_resolver for intelligent disambiguation
5. **Action Triggers with Candidate Selector** - Ultra-fast routing (< 5ms) with centralized candidate validation
6. **MCP Integration** ✨ NEW - Calendar scheduling + Gmail email sending
7. **Text-to-Speech (TTS)** ✨ NEW - Synchronized audio output with Kokoro ONNX
8. **Speech-to-Text (STT)** ✨ NEW - Audio input transcription with Groq Whisper
9. **Context Enricher** - Universal enrichment in ALL paths before LLM (~0-6ms)
10. **Silent Loading** - Pre-loads context on mount (~500ms one-time, then 0ms cached)
11. **Fast Path General** - General conversation without DB queries (~1ms + LLM)
12. **Smart Caching** - Context invalidation based on domain (domain=hr_related forces reload)
13. **UI State Communication** - current_state computed for frontend adaptation
14. **PostgreSQL Checkpointing** - Full conversation state persistence via LangGraph

---

## 🏗️ Architecture Overview (v3.6)

### LangGraph State Machine

The agent uses a **StateGraph** with **34 specialized nodes** organized in **9 categories** and **15 conditional routes**:

```
START
  ↓
state_logger_start
  ↓
trigger_checker (detects action triggers < 5ms)
  ↓
trigger_checker_route
  ├─→ (pending_mcp_action) pending_data_extractor → selection_resolver
  └─→ (no pending_mcp) post_trigger
        ↓
      post_trigger_route
        ├─→ (action_trigger or mcp_action) selection_resolver → candidate_selector
        │     ↓
        │   candidate_selector_route
        │     ├─→ (no resumeId) direct_response → END (asks for candidate selection)
        │     ├─→ (questions) question_generator → action_generator_route → llm_response/direct_response → END
        │     ├─→ (email) email_generator → action_generator_route → llm_response/direct_response → END
        │     ├─→ (compare) comparison_generator → direct_response → END
        │     ├─→ (schedule_interview) mcp_action_executor → direct_response → END
        │     ├─→ (send_email_confirmed) email_send_executor → direct_response → END
        │     └─→ (unexpected) unexpected_handler → direct_response → END
        │
        └─→ (no trigger) silent_load_detector
              ↓
            silent_load_detector_route
              ├─→ (silent_load=True) silent_loader_checker → silent_loader_route
              │                                            → context_loader → END (pre-load ~500ms)
              │
              └─→ (silent_load=False) pending_action_resolver
                    ↓
                  job_mention_checker (fuzzy matching for jobs)
                    ↓
                  job_mention_route
                    ├─→ (has_job_mention=True) candidate_filter → candidate_detector
                    │                                            → candidate_detector_route
                    │                                              ├─→ (conflict) direct_response → END
                    │                                              ├─→ (job_id exists) context_resolver
                    │                                              └─→ (no job_id) job_list_checker
                    │
                    └─→ (has_job_mention=False) candidate_detector
                          ↓
                        candidate_detector_route
                          ├─→ (conflict) direct_response → END
                          ├─→ (job_id exists) context_resolver
                          └─→ (no job_id) job_list_checker
                                ↓
                              job_list_route
                                ├─→ (wants_job_list or resumeId) context_resolver
                                └─→ (no) candidates_full_list_checker → context_resolver

                    CONTEXT_RESOLVER (v3.5 - detects candidates + jobs)
                          ↓
                    context_resolver_route
                      ├─→ (pending_action_candidate) llm_response → END (clarification)
                      ├─→ (job_description sin candidatos) talk_with_state → talk_with_state_route
                      ├─→ (job + candidates) talk_with_state → talk_with_state_route
                      ├─→ (wants_job_list or wants_candidates_full_list) talk_with_state → talk_with_state_route
                      └─→ (no context) domain_checker

                    TALK_WITH_STATE → talk_with_state_route
                      ├─→ (AIMessage: CASO 0A/0B/0C/0D) direct_response → END (NO LLM ⚡)
                      └─→ (SystemMessage: CASO 1/2/3) llm_response → END

                    DOMAIN_CHECKER + PATHS
                          ↓
                    domain_route
                      ├─→ (hr_related) context_loader → context_loader_route
                      │                                  ├─→ (silent_load) END
                      │                                  └─→ intent_checker → intent_route
                      │                                     ├─→ (job) job_handler → resume_matcher → context_enricher
                      │                                     ├─→ (resume) resume_handler → context_enricher
                      │                                     └─→ (general) context_enricher
                      │                                        ↓
                      │                                      general_talk → llm_response → END
                      │
                      └─→ (general) context_enricher → general_talk → llm_response → END (FAST PATH ⚡)

                    (all paths via direct_response)
                          ↓
                    tts_direct_response (if voice enabled) ✨ v3.6
                          ↓
                    state_logger_end → END
```

### 11 Key Agent Flows

#### 1️⃣ Action Trigger Path (< 5ms detection + candidate selection + LLM)
- **Frontend sends explicit trigger** OR heuristic detection
- **Types:** `questions` (interview questions), `email` (drafting), `compare` (comparison)
- **`candidate_selector`** validates/resolves candidate before generators
- **Performance:** 0ms (frontend) or ~1ms (heuristic)

#### 2️⃣ MCP Action Path (Calendar/Gmail integration) ✨ NEW v3.5
- **`trigger_checker`** detects `schedule_interview` via MCP keywords
- **`pending_data_extractor`** extracts email/datetime from message
- **`mcp_action_executor`** creates Calendar event + sends invite
- **Multi-turn:** collects recruiter_email → datetime → executes

#### 3️⃣ Email Send Path (after email generation) ✨ NEW v3.5
- After `email_generator` creates draft → asks for confirmation
- `send_email_confirmed=True` → `email_send_executor` sends via Gmail
- `send_email_confirmed=False` → `direct_response` with cancellation message

#### 4️⃣ Silent Loading Path (~500ms one-time)
- **Special message:** "start-loading-state"
- **Flow:** silent_load_detector → silent_loader_checker → context_loader → END
- **Purpose:** Pre-loads jobs + resumes without user response
- **Performance:** ~500ms one-time, then 0ms cached

#### 5️⃣ Fast Path v3.0 - Early Detection (< 10ms + LLM)
- **Flow:** context_resolver → talk_with_state → llm_response → END
- **Trigger:** When job_id or matched_resumes are detected
- **Skips:** domain_checker + context_loader (~500ms saved!)
- **Performance:** < 10ms to reach LLM

#### 6️⃣ Fast Path - Job Description (< 10ms, NO LLM) ✨ NEW v3.4
- **Trigger:** `has_job_mention=True` + `asked_for_candidate=False`
- **Flow:** context_resolver → talk_with_state → direct_response → END
- **What happens:** Shows job description + candidate count
- **Performance:** < 10ms total (no LLM latency)

#### 7️⃣ Fast Path - Job + Candidates (< 10ms, NO LLM) ✨ NEW v3.5
- **Trigger:** `has_job_mention=True` + `asked_for_candidate=True`
- **Flow:** candidate_filter → talk_with_state → direct_response → END
- **What happens:** Shows candidate table sorted by thumbUp + score
- **Performance:** < 10ms total (no LLM latency)

#### 8️⃣ Fast Path - Full Candidate List (< 10ms, NO LLM) ✨ NEW v3.5
- **Trigger:** `candidates_full_list_checker` detects request for all candidates
- If ≤30 candidates → shows full table with scores + approval status
- If >30 candidates → shows summary by job with counts, asks for specific job
- **Performance:** < 10ms total (no LLM latency)

#### 9️⃣ Fast Path - General (~1ms + LLM)
- **Casual conversation** (domain=general)
- **Flow:** domain_checker → context_enricher → general_talk → llm_response
- **Performance:** ~1ms + LLM (no DB queries)

#### 🔟 Complete HR Path (~0-500ms + analysis)
- **HR-related questions** with full context loading
- **Flow:** domain_checker → context_loader → intent_checker → job/resume handlers
- **All paths** go through context_enricher before general_talk
- **Performance:** ~0-500ms (0ms cached, ~500ms when invalidated) + LLM

#### 1️⃣1️⃣ TTS Sync Path (audio synchronized with text) ✨ NEW v3.6
- All `direct_response` paths pass through `tts_direct_response`
- If `voice` enabled in config → generates audio from `tts_content` or AIMessage
- Text streams 30% faster than audio (finishes before audio ends)
- Delay calculated from real WAV duration (not estimated)
- Text + audio emitted together on first word

---

## 📊 Performance Metrics (v3.6)

| Operation | Latency | Description |
|-----------|---------|-------------|
| **Action Trigger Detection** | < 5ms | Frontend explicit (0ms) or heuristic (~1ms) |
| **MCP Action Detection** ✨ | < 5ms | Schedule interview keywords (ES/EN/FR) |
| **Silent Load Detection** | < 1ms | Detects "start-loading-state" command |
| **Pending Action Resolver** | ~1-5ms | Resolves conflicts from previous turn |
| **Job Mention Checker** | ~1-5ms | Fuzzy matching for job detection (30%) |
| **Candidate Detector** | ~1-3ms | Fuzzy matching + conflict detection |
| **Job List Checker** | < 1ms | Detects list request keywords |
| **Candidates Full List Checker** ✨ | < 1ms | Detects all candidates request |
| **Candidate Filter** | ~1-3ms | Filters candidates by job + keywords |
| **Candidate Selector** ✨ | ~1-5ms | Centralized candidate validation |
| **Talk With State** | < 5ms | Fast path v3.0 prompt preparation |
| **Fast Path v3.0** | **< 10ms + LLM** | Skips domain_checker + context_loader |
| **Fast Path (candidates list)** ✨ | **< 10ms, NO LLM** | Full list or summary |
| **Fast Path (job + candidates)** ✨ | **< 10ms, NO LLM** | Candidate table for job |
| **Silent Loading** | ~500ms → 0ms | One-time pre-load, then cached |
| **Context Resolver** | ~3-50ms | Fuzzy matching for candidate context |
| **Context Enricher** | ~0-6ms | Enrichment in all paths |
| **Fast Path (General)** | ~1ms + LLM | No DB queries for casual conversation |
| **HR Path (First)** | ~500ms + LLM | Context load with JOINs + analysis |
| **HR Path (Cached)** | 0ms + LLM | Cache hit - no DB queries |
| **HR Path (Invalidated)** | ~500ms + LLM | Force reload when domain=hr_related |
| **MCP Execution** ✨ | ~500-2000ms | Calendar event creation + email invite |
| **TTFT** | ~962ms | Time to first token from GPT-4o-mini |
| **Total LLM** | ~2275ms | Complete response generation |
| **TTS Synthesis** ✨ | ~3-6s | Kokoro ONNX audio generation |
| **TTS Sync delay** ✨ | ~100-170ms/word | Real WAV duration (+30% faster) |

### Optimization Impact (v3.6)

- **Fast Path v3.0:** ~500ms → < 10ms (skips domain_checker + context_loader)
- **Fast Path v3.5:** NO LLM for job description, job+candidates, candidates list
- **Multi-Level Detection:** 8 layers, < 5ms each (total ~8-40ms max)
- **Candidate Selector:** Centralized validation prevents duplicate logic
- **MCP Integration:** Calendar + email in single agent flow
- **Conflict Handling:** Prevents ambiguous queries from reaching LLM
- **Action Triggers:** 200ms → 5ms (skip domain/intent checks)
- **Silent Loading:** 500ms → 0ms (pre-load eliminates first message delay)
- **Fast Path General:** 500ms → 1ms (no DB for casual conversation)
- **Context Caching:** 500ms → 0ms (reuse loaded data)
- **TTS Sync:** Text + audio delivered together, synchronized finish

---

## 🧠 State Management (v3.6)

### HRState (TypedDict)

The agent's state includes:

```python
class HRState(TypedDict):
    # Conversational messages
    messages: Annotated[List[AnyMessage], add_messages]

    # Recruiter
    recruiter_id: str | None

    # Jobs
    job_id: str | None
    job_name: str | None
    job_description: str | None
    job_data: dict | None
    available_jobs: List[Dict[str, str]] | None

    # Resumes
    resumeId: str | None
    resume_name: str | None
    resume_job_related_id: str | None
    resume_job_related_id_score: str | None
    available_resumes: List[Dict] | None
    matched_resumes: List[Dict] | None          # Resumes filtered by job_id
    matched_resumes_info: str | None             # Formatted candidate info
    duplicate_resumes: List[Dict] | None         # Candidates with same name
    selected_resumes_full_data: List[Dict] | None  # Full data of mentioned candidates

    # Detection & Classification
    domain: str | None              # "hr_related" | "general"
    user_intent: str | None         # "job" | "resume" | "general"
    language: str | None            # "es" | "en" | "fr"
    silent_load: bool | None

    # Triggers & Actions
    action_trigger: str | None      # "questions" | "email" | "compare"
    email_type: str | None          # "rejection" | "invitation" | "request_info" | "follow_up"
    pending_action: str | None      # Persists across turns until resolved
    pending_action_candidate: str | None  # "clarify_candidate" | "clarify_duplicate" | "clarify_multiple_jobs"

    # Detection Flags
    wants_job_list: bool | None
    wants_candidates_full_list: bool | None     # ✨ v3.5 - Full candidate list request
    candidates_summary_shown: bool | None       # ✨ v3.5 - True if >30 summary was shown
    has_job_mention: bool | None
    asked_for_candidate: bool | None

    # =========================================================================
    # MCP Actions (Gmail/Calendar integration) ✨ v3.5
    # =========================================================================
    mcp_action: str | None              # "schedule_interview" | None
    pending_mcp_action: str | None      # "schedule_interview" | None (waiting for data)
    recruiter_email: str | None         # Recruiter's real email for invites
    interview_datetime: str | None      # ISO format: "2025-01-25T15:00:00"
    interview_duration: int | None      # Duration in minutes (default: 60)

    # =========================================================================
    # Email Send ✨ v3.5
    # =========================================================================
    generated_email_content: str | None   # Email content generated by LLM
    generated_email_subject: str | None   # Email subject
    pending_email_send: bool | None       # True when email awaits confirmation
    send_email_confirmed: bool | None     # True when user confirmed sending

    # =========================================================================
    # Error Handling ✨ v3.5
    # =========================================================================
    unexpected_retry_count: int | None    # 0 = ask to rephrase, 1+ = soft reset

    # =========================================================================
    # UI State (frontend communication) ✨ v3.5
    # =========================================================================
    current_state: str | None   # 'booking' | 'email' | 'question' | 'compare' | 'chat'

    # =========================================================================
    # TTS (Text-to-Speech) ✨ v3.6
    # =========================================================================
    tts_content: str | None     # Optimized text for audio (different from visual AIMessage)
                                # If set, tts_direct_response uses this instead of AIMessage.content
                                # Allows nodes to provide shorter/simpler audio text
```

---

## 🔧 Node Categories (34 Total in v3.6)

### 1️⃣ Entry & Logging (2 nodes)
- **state_logger_start** - Initial state logging with counts
- **state_logger_end** - Final state logging + metrics

### 2️⃣ Fast Detection Layer (8 nodes - < 5ms each)
- **trigger_checker** - Detects action triggers + MCP actions
- **silent_load_detector** - Detects "start-loading-state" message
- **pending_action_resolver** - Resolves pending actions from previous turns
- **job_mention_checker** - Fuzzy matching for job mentions
- **candidate_filter** - Filters candidates by job_id + detects candidate keywords
- **candidate_detector** - Fuzzy matching for candidate mentions + conflict handling
- **job_list_checker** - Keyword matching for job list requests
- **candidates_full_list_checker** ✨ v3.5 - Keyword matching for full candidate list requests

### 3️⃣ Action Trigger System (8 nodes)
- **selection_resolver** - Resolves job/candidate selection for triggers
- **candidate_selector** ✨ v3.5 - Centralized candidate validation before generators
- **question_generator** - Generates interview questions (✅ implemented)
- **email_generator** - Generates personalized emails (✅ implemented)
- **comparison_generator** - Generates candidate comparisons (✅ implemented)
- **direct_response** - Streams AIMessage without LLM (+ email cancellation handling)
- **silent_loader_checker** - Verifies silent_load flag
- **post_trigger** - Pass-through for routing after trigger_checker

### 4️⃣ Context Management (4 nodes)
- **context_resolver** - Detects candidate/job context BEFORE routing (v3.5: +candidates_full_list, +job+candidates pass-through)
- **talk_with_state** - Prepares prompts using detected state (v3.5: CASO 0A/0A-FOLLOW/0B/0C/0D + fallbacks)
- **context_loader** - Loads jobs + resumes from DB (with cache)
- **context_enricher** - Enriches context in ALL paths

### 5️⃣ Intent & Domain Routing (5 nodes)
- **domain_checker** - HR vs general pre-filter (heuristic + Claude Haiku)
- **intent_checker** - Job vs resume vs general (GPT-4o-mini)
- **job_handler** - Identifies specific job from available_jobs
- **resume_handler** - Identifies candidate + duplicate detection
- **resume_matcher** - Analyzes candidates for job with streaming

### 6️⃣ LLM Invocation (2 nodes)
- **general_talk** - Prepares system prompts for all scenarios
- **llm_node** - Invokes LLM with streaming (GPT-4o-mini)

### 7️⃣ MCP & Email Integration (3 nodes) ✨ v3.5
- **pending_data_extractor** - Extracts email/datetime from user message for MCP actions
- **mcp_action_executor** - Executes MCP actions (Calendar event creation + Gmail invite)
- **email_send_executor** - Sends generated emails via Gmail after user confirmation

### 8️⃣ Error Handling (1 node) ✨ v3.5
- **unexpected_handler** - Handles unexpected states with retry (1st: ask to rephrase, 2nd+: soft reset)

### 9️⃣ Text-to-Speech (1 node) ✨ v3.6
- **tts_direct_response** - TTS handler for direct_response paths (generates audio if voice enabled)

---

## 🛤️ Conditional Routes (15 Total in v3.6)

| Route | From Node | Logic | Destinations |
|-------|-----------|-------|--------------|
| **trigger_checker_route** ✨ | trigger_checker | Has pending_mcp_action? | pending_data_extractor / post_trigger |
| **post_trigger_route** | post_trigger | Has action_trigger or mcp_action? | selection_resolver / silent_load_detector |
| **candidate_selector_route** ✨ | candidate_selector | Has resumeId? Which action? | direct_response / question_gen / email_gen / comparison_gen / mcp_action / email_send / unexpected |
| **action_generator_route** | question/email_gen | Message type? | direct_response / llm_response |
| **silent_load_detector_route** | silent_load_detector | Silent load? | silent_loader_checker / pending_action_resolver |
| **silent_loader_route** | silent_loader_checker | Validated? | context_loader / context_resolver |
| **job_mention_route** | job_mention_checker | Has job mention? | candidate_filter / candidate_detector |
| **candidate_detector_route** | candidate_detector | Conflict or context? | direct_response / context_resolver / job_list_checker |
| **job_list_route** | job_list_checker | Wants list or has resumeId? | context_resolver / candidates_full_list_checker |
| **context_resolver_route** | context_resolver | Pending action or context? | llm_response / talk_with_state / domain_checker |
| **talk_with_state_route** ✨ | talk_with_state | AIMessage or SystemMessage? | direct_response / llm_response |
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

**With TTS (voice output):**
```
POST /chat_agent/{thread_id}/stream?voice=af_heart
```

**Response (SSE):**
```
data: {"type": "start", "voice_enabled": true}
data: {"type": "content", "content": "I found", "state": "chat"}
data: {"type": "content", "content": " 3 candidates", "state": "chat"}
...
data: {"type": "audio", "sequence": 1, "url": "/audio/temp/abc123.wav"}
data: {"type": "audio", "sequence": 2, "url": "/audio/temp/def456.wav"}
data: {"type": "end", "audio_count": 2}
```

**GET /chat_agent/{thread_id}/history** - Conversation history

### Audio Endpoints (STT + TTS) ✨ v3.6

**POST /audio/transcribe** - Transcribe audio to text (STT)
```
Content-Type: multipart/form-data
Body: file (audio), language (optional)
Response: { "text": "transcribed text" }
```

**POST /audio/chat/{chat_id}** - Transcribe + chat with streaming (SSE)
```
Content-Type: multipart/form-data
Body: file (audio), recruiterId, language (optional)

Response (SSE):
data: {"type": "transcription", "text": "Show me candidates"}
data: {"type": "agent", "content": "I found..."}
data: {"type": "done"}
```

**GET /audio/temp/{filename}** - Serve generated TTS audio files

### Sync Endpoints

**POST /resumes/sync** - Bulk candidate sync
**POST /jobs/sync** - Bulk job sync

### Thread Management

**GET /threads?recruiterId=xxx** - List recruiter's threads
**DELETE /threads/{thread_id}** - Delete specific thread

---

## 🎙️ Voice Features (v3.6)

### Speech-to-Text (STT)

- **Engine:** Groq Whisper (whisper-large-v3-turbo)
- **Input:** Audio file (WAV, MP3, WebM, etc.)
- **Output:** Transcribed text
- **Frontend Integration:**
  - MediaRecorder API for recording
  - Sends audio blob to `/audio/chat/{chat_id}`
  - Receives transcription + agent response in SSE stream

### Text-to-Speech (TTS)

- **Engine:** Kokoro ONNX (local, thread-safe)
- **Voices:** `af_heart`, `af_bella`, `af_sarah`, `em_alex`, `ef_dora`, `ff_siwis`
- **Output:** WAV audio files served via `/audio/temp/{filename}`
- **Synchronization:**
  - Text + audio emitted together on first word
  - Text streams 30% faster than audio
  - Delay calculated from real WAV duration
  - Formula: `delay = (audio_duration / word_count) * 0.7`

### Frontend Audio Queue

The frontend implements an ordered audio queue:
1. Audio events arrive with sequence numbers (may be out of order)
2. When audio #1 arrives → start playing immediately
3. When current audio finishes → play next expected sequence
4. If expected sequence not available → wait until it arrives
5. Stream end → sort remaining and play any missed sequences

---

## 💡 Key Design Patterns (v3.6)

### 1. Multi-Level Detection Pattern
- **8 layers of detection** before reaching domain_checker
- Each layer < 5ms
- Total overhead: ~8-40ms max

### 2. Fast Path v3.0 Pattern
- **context_resolver → talk_with_state**
- Skips domain_checker + context_loader (~500ms saved)
- Activated when job_id or matched_resumes detected

### 3. Fast Path v3.5 Pattern (NO LLM)
- Job description, Job+Candidates, Full candidate list
- Deterministic responses without LLM
- < 10ms total latency

### 4. Centralized Candidate Selection Pattern ✨ v3.5
- `candidate_selector` validates candidate BEFORE any generator
- Detection strategies: number, exact name, fuzzy name, job mention
- Handles duplicates with clarification prompt

### 5. MCP Multi-Turn Pattern ✨ v3.5
- Multi-turn data collection: recruiter_email → datetime → execution
- `mcp_action_executor` executes final action (Calendar + Gmail)

### 6. Email Send Confirmation Pattern ✨ v3.5
- `email_generator` creates draft → asks user to confirm
- Confirmed → `email_send_executor` sends via Gmail

### 7. TTS Sync Pattern ✨ v3.6
- `tts_content` state field for optimized audio text
- Text streams 30% faster than audio (synchronized finish)
- Delay calculated from real WAV duration

### 8. UI State Pattern ✨ v3.5
- `current_state` computed from action fields
- Frontend reads to adapt UI (buttons, inputs, etc.)
- Mapping: schedule_interview→"booking", questions→"question", email→"email", compare→"compare"

### 9. Error Recovery Pattern ✨ v3.5
- `unexpected_handler` catches unexpected states
- First attempt: ask to rephrase
- Second attempt: soft reset

### 10. Universal Enrichment Pattern
- ALL paths go through `context_enricher` before `general_talk`

### 11. Cache Invalidation Pattern
- `context_loader` checks `domain=hr_related`
- Forces cache reload to ensure fresh data

### 12. Fuzzy Matching Pattern
- Used in: job_mention_checker, candidate_detector, candidate_selector, context_resolver
- Threshold: **30% similarity** for typo tolerance

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
- Groq Whisper (Speech-to-Text)
- Kokoro ONNX (Text-to-Speech, local)

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

## 📝 Production Features (v3.6)

✅ **34 Specialized Nodes** - Organized in 9 categories
✅ **15 Conditional Routes** - Intelligent flow control
✅ **11 Key Agent Flows** - Including MCP, TTS, and NO-LLM fast paths
✅ **Multi-Level Detection** - 8 layers of ultra-fast detection (< 5ms each)
✅ **Fast Path v3.0** - < 10ms to LLM (skips domain + context_loader)
✅ **Fast Path v3.5** - NO LLM for job description, job+candidates, candidates list
✅ **MCP Integration** ✨ - Calendar scheduling + Gmail email sending
✅ **Text-to-Speech** ✨ - Synchronized audio output with Kokoro ONNX
✅ **Speech-to-Text** ✨ - Audio input transcription with Groq Whisper
✅ **Centralized Candidate Selector** - Validates before all generators
✅ **Conflict Handling** - candidate_detector + pending_action_resolver
✅ **Fuzzy Matching** - 30% threshold for typo tolerance
✅ **UI State Communication** - Frontend adaptation support
✅ **Error Recovery** - unexpected_handler with retry
✅ **Multi-Model Strategy** - GPT-4o-mini + Claude Haiku
✅ **Smart Caching** - Invalidation based on domain
✅ **PostgreSQL Checkpointing** - Full state persistence
✅ **SSE Streaming** - Real-time responses with audio sync
✅ **Multi-language** - ES/EN/FR support

---

## 📚 Changelog

### v3.6 - 2026-02-01 ✨ TEXT-TO-SPEECH INTEGRATION

- 🔊 **TEXT-TO-SPEECH (TTS) SYSTEM**
  - `tts_direct_response`: New node between direct_response and state_logger_end
  - Kokoro ONNX local TTS engine (thread-safe, no external API)
  - Multiple voices: `af_heart`, `af_bella`, `af_sarah`, etc.

- 🎙️ **DUAL TEXT CONTENT (Visual vs Audio)**
  - `tts_content` state field: Optimized text for audio
  - Example: Visual shows full candidate list, audio says "I found 78 candidates"

- ⚡ **SYNCHRONIZED STREAMING**
  - Text + audio emitted together (audio with first word)
  - Delay calculated from real WAV duration
  - Text streams 30% faster than audio

### v3.5 - 2026-01-27 ✨ MCP INTEGRATION + CANDIDATE SELECTOR

- 📅 **MCP INTEGRATION (Calendar/Gmail)**
- 📧 **EMAIL SENDING** with confirmation flow
- 🎯 **CANDIDATE SELECTOR** - Centralized validation
- 📋 **FULL CANDIDATE LIST** - Smart summary for >30 candidates
- ⚠️ **ERROR HANDLING** - unexpected_handler
- 🖥️ **UI STATE** - current_state for frontend

### v3.4 - 2026-01-15 ✨ JOB DESCRIPTION FAST PATH

- 📋 **NEW FAST PATH: Job Description without Candidates** (NO LLM)

### v3.0 - 2026-01-12 ✨ MAJOR ARCHITECTURE UPDATE

- 🏗️ **COMPLETE AGENT FLOW REDESIGN**
- 🚀 **7 NEW DETECTION NODES** - Multi-level detection system
- 🛤️ **6 NEW ROUTES** - Intelligent flow control

---

**Last updated:** 2026-02-01
**Version:** 3.6.0
**Backend Repository:** https://github.com/martinpercu/agent-ai-bridge-to-works

