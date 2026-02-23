# Pixel Office AI

A pixel-art AI office where animated characters are your personal AI workforce.
Give a job to the Boss, watch the team spring into action, and get real results —
with persistent memory, live task tracking, and a character for every role.

---

## Screenshots

```
┌─────────────────────────────────────────────────────────────────────┐
│  PIXEL OFFICE AI                                              v0.1.0 │
├──────────────────────────────────────┬──────────────────────────────┤
│                                      │ OUTPUT                        │
│   [Boss Desk]                        │                               │
│    Michael 😄 ████████░░ 80%         │ > Research the latest...      │
│    "Write inspirational memo"        │                               │
│                                      │ BOSS PLAN                     │
│   Rex 🎯  Dev 😄  Wren 🎯            │ Assigning to Rex              │
│   Ada 😑  Aria 😄                    │                               │
│                                      │ REX ✓                         │
│                     [ Inspector ]    │ Here's what I found...        │
│   Name: Rex (Researcher)             │                               │
│   Mood: focused 🎯                   │                               │
│   Status: working                    │                               │
│   Task: Research AI trends  ██████░  │                               │
│   Up next: Summarise findings        │                               │
│   Last said: "On it. Probably."      │                               │
├──────────────────────────────────────┴──────────────────────────────┤
│ > Give the Boss a task...                                   [SEND]   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

### AI Workforce
- **6 specialized agents** — Boss, Researcher (Rex), Developer (Dev), Writer (Wren), Analyst (Ada), Assistant (Aria)
- **Boss orchestration** — The Boss reads your request, writes a plan, and dispatches sub-agents in parallel
- **Parallel execution** — Multiple agents work simultaneously on different parts of a job
- **Persistent memory** — Every agent remembers past sessions via SQLite + FTS5; summaries are auto-injected into future prompts

### Live Office Scene
- **Animated sprites** — Characters walk around the office, sit at desks, and react to their current status (idle, working, thinking, done)
- **Speech bubbles** — Idle quips and working one-liners float above characters in real time
- **A\* pathfinding** — Characters navigate around desks and walls on a tile grid
- **Collision-free strolling** — When idle, characters take random walks without overlapping furniture

### Task System
- **Per-character task pools** — Each agent has 6 domain-specific tasks they cycle through while working
- **Live progress bars** — A progress bar above each character fills as they tick through their current task (every 3–4 s)
- **Task completion** — Finishing a task flips mood to happy 😄, logs it to history, and moves to the next task
- **Completed task history** — The last 3 finished tasks are stored per character

### Character Polish
- **Drop shadows** — A blurred ellipse under each character grounds them in the scene
- **Floating nameplates** — Always-visible name + mood emoji above every character; colour-coded per agent
- **Mood system** — Each character has a mood (happy 😄, focused 🎯, bored 😑, stressed 😰) that re-rolls every 20–40 s and reacts to task completions

### Click-to-Inspect Sidebar
Click any character to open a detail panel showing:
- Full name, role, and current mood
- Live status badge (idle / working / thinking / done)
- Current task with animated progress bar
- Up-next queue (next 3 tasks)
- Completed task history
- Last thing the character said

Close with the **✕** button or press **Escape**.

### Memory Viewer
- Click any character while the Memory Viewer tab is active to inspect their SQLite memory
- Browse **Summaries** (compressed session history), **Observations** (raw decisions), and **Global** facts shared across all agents

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Clone & Install

```bash
git clone https://github.com/Cfsthk/pixel-office-ai.git
cd pixel-office-ai
npm install
```

### 2. Configure Environment

```bash
cp env.example .env
```

Open `.env` and fill in your keys:

```env
# Required — powers all agent reasoning
DEEPSEEK_API_KEY=your_key_here

# Optional — enables live web search for Rex (Researcher)
TAVILY_API_KEY=your_key_here

# Optional — enables GitHub actions for Aria (Assistant)
GITHUB_TOKEN=your_token_here
```

**Where to get keys:**
| Key | Where |
|---|---|
| `DEEPSEEK_API_KEY` | https://platform.deepseek.com → API Keys |
| `TAVILY_API_KEY` | https://tavily.com → free tier available |
| `GITHUB_TOKEN` | https://github.com/settings/tokens → classic, repo scope |

### 3. Run in Development

```bash
npm run dev
```

This starts Vite (React renderer) on port 5173, then launches Electron pointing at it.
Hot-reload is active — changes to renderer files update instantly without restarting Electron.

### 4. Build for Production

```bash
npm run build    # Compile React + Electron TypeScript
npm run package  # Bundle with electron-builder → release/
```

Output platform targets:
- **macOS** → `.dmg`
- **Windows** → `.exe` (NSIS installer)
- **Linux** → `.AppImage`

---

## How to Use

### Giving the Boss a Task

Type anything into the input bar at the bottom and press **Send** (or hit **Enter**).

The Boss will:
1. Read your request and write an internal plan
2. Route sub-tasks to the right agents (Rex for research, Dev for code, etc.)
3. Run agents in parallel where possible
4. Return a combined result in the Output panel

**Example prompts:**
- `"Research the latest trends in LLM fine-tuning and write a 3-paragraph summary"`
- `"Write a Python script that parses a CSV and outputs a bar chart"`
- `"Draft a professional reply to a client asking for a project status update"`
- `"Analyse this data: [paste numbers] and tell me the key insights"`

### Reading the Output Panel

Results appear in the Output panel on the right as agents finish. Each agent's
response is labeled with their name. The Boss's routing plan appears first,
followed by each sub-agent's result as they complete.

### Watching the Office

While a job runs you can watch the scene:
- Characters **animate** into working poses at their desks
- **Speech bubbles** show working quips ("Executing with maximum efficiency.")
- **Progress bars** on nameplates fill as each agent ticks through their task
- **Mood emojis** update in real time

### Inspecting a Character

**Click any character** to open the Inspector sidebar on the right of the scene:

| Section | What it shows |
|---|---|
| Header | Name, role badge, mood emoji |
| Status | Current status (idle / working / thinking / done) |
| Current task | Task name + live animated progress bar |
| Up next | Next 3 tasks in their queue |
| Completed | Last 3 tasks they finished |
| Last said | Most recent speech bubble text |

Press **Escape** or click **✕** to close.

### Inspecting Memory

Switch to the **Memory** tab (if visible) and click a character to read their
full SQLite memory: summaries of past jobs, raw observations, and global facts.

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `G` | Toggle the navigation grid debug overlay |
| `Escape` | Close the inspector sidebar |
| `Enter` | Send the current input to the Boss |

---

## Architecture

```
src/
├── main/                        # Electron main process (Node.js)
│   ├── main.ts                  # App entry point, IPC handlers
│   ├── preload.ts               # Secure renderer <-> main bridge
│   ├── llm/
│   │   └── deepseek.ts          # DeepSeek API client (OpenAI-compatible)
│   ├── memory/
│   │   ├── database.ts          # SQLite schema + FTS5 queries
│   │   └── manager.ts           # Per-agent memory: inject, record, compress
│   └── agents/
│       ├── base.ts              # BaseAgent — LLM call, memory, tool loop
│       ├── boss.ts              # Orchestrator — routing + parallel dispatch
│       ├── researcher.ts        # Rex — web research via Tavily
│       ├── developer.ts         # Dev — code generation + file operations
│       ├── writer.ts            # Wren — drafts, emails, copy
│       ├── analyst.ts           # Ada — data analysis + calculations
│       ├── assistant.ts         # Aria — GitHub, scheduling, integrations
│       └── registry.ts          # Agent lookup map
└── renderer/                    # React UI (Vite + Tailwind)
    ├── App.tsx                  # Root component + IPC state
    ├── index.css                # Pixel art styles + keyframe animations
    └── components/
        ├── OfficeScene.tsx      # Office layout, A* nav, task system, inspector
        ├── SpriteAnimator.tsx   # Sprite sheet frame cycling per status
        ├── AgentDesk.tsx        # Desk + speech bubble per character
        ├── InputPanel.tsx       # Task input bar
        ├── ResultsPanel.tsx     # Job output + history
        └── MemoryViewer.tsx     # Per-agent memory inspector
```

---

## Memory System

Each agent has persistent memory in SQLite at `~/.pixel-office-ai/data/memory.db`.

### How it works

1. **Job starts** — Agent's recent summaries + global facts injected into system prompt
2. **During job** — Every tool call, decision, and result saved as an observation
3. **Job ends** — DeepSeek compresses observations into a concise summary
4. **Next job** — Summary is automatically available; agent "remembers" past work

### Memory tables

| Table | Purpose |
|---|---|
| `sessions` | Every job submitted by the user |
| `observations` | Raw tool calls and decisions per agent per session |
| `summaries` | AI-compressed session summaries (injected on next run) |
| `global_memory` | Shared facts any agent can read or write |
| `observations_fts` | FTS5 full-text search index over observations |
| `summaries_fts` | FTS5 full-text search index over summaries |

---

## The Agents

| Character | Name | Specialty | Personality |
|---|---|---|---|
| Boss | Michael | Routing, orchestration, planning | Sharp, decisive, no-nonsense |
| Researcher | Rex | Web research, fact-finding, citations | Curious, thorough, cites sources |
| Developer | Dev | Code generation, debugging, scripts | Pragmatic, clean code advocate |
| Writer | Wren | Drafts, emails, long-form copy | Creative, precise, hates jargon |
| Analyst | Ada | Data analysis, CSV, calculations | Data-driven, always shows her work |
| Assistant | Aria | GitHub, scheduling, integrations | Organised, proactive, reliable |

---

## Adding a New Agent

1. Create `src/main/agents/myagent.ts` extending `BaseAgent`
2. Implement `execute(task: string, systemPrompt: string): Promise<string>`
3. Register it in `src/main/agents/registry.ts`
4. Add a desk position in `OfficeScene.tsx` (`AGENT_DESKS` array)
5. Add a colour in `AGENT_COLORS` in `OfficeScene.tsx`
6. Add task pool entries in `TASK_POOLS` for the task system
7. Add idle and working quips in `IDLE_QUIPS` and `WORKING_QUIPS`

---

## Roadmap

- [ ] Real pixel art sprite sheets per character (currently using placeholder sprites)
- [ ] Drag and drop files onto agent desks
- [ ] Voice input
- [ ] Gmail integration for Aria
- [ ] Agent-to-agent messaging visible in the office scene
- [ ] Job queue / task board view
- [ ] Export results as PDF or Markdown documents
- [ ] Configurable LLM backend (swap DeepSeek for GPT-4o, Claude, etc.)

---

## License

MIT