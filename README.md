# Pixel Office AI

A pixel-art AI office where animated characters are your personal AI workforce.
Give a job to the Boss, watch the team spring into action, and get results — all with persistent memory so your agents never forget.

---

## Screenshots

```
┌─────────────────────────────────────────────────┐
│  PIXEL OFFICE AI                          v0.1.0 │
├────────────────────────────┬────────────────────┤
│                            │ OUTPUT             │
│     [ The Office ]         │                    │
│                            │ > Research the ... │
│      [Boss Desk]           │                    │
│                            │ BOSS PLAN          │
│  [Rex] [Dev] [Wren]        │ Assigning to Rex   │
│                            │                    │
│  [Ada]       [Aria]        │ REX ✓              │
│                            │ Here's what I ...  │
├────────────────────────────┴────────────────────┤
│ > Give the Boss a task...              [SEND]   │
└─────────────────────────────────────────────────┘
```

---

## Features

- **6 AI agents** - Boss, Researcher (Rex), Developer (Dev), Writer (Wren), Analyst (Ada), Assistant (Aria)
- **ClaudeMem-style memory** - Every agent remembers past sessions via SQLite + FTS5 search
- **Parallel execution** - Boss splits big jobs across multiple agents simultaneously
- **Memory viewer** - Click any character to inspect their memory (summaries, observations, global facts)
- **Pixel art office** - Animated characters react to their work status in real time

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- npm 9+

### 2. Clone & Install

```bash
git clone https://github.com/Cfsthk/pixel-office-ai.git
cd pixel-office-ai
npm install
```

### 3. Configure Environment

```bash
cp env.example .env
```

Open `.env` and fill in your keys:

```env
# Required
DEEPSEEK_API_KEY=your_key_here

# Optional (enables web search for Rex)
TAVILY_API_KEY=your_key_here

# Optional (enables GitHub actions for Aria)
GITHUB_TOKEN=your_token_here
```

**Getting API keys:**
- DeepSeek: https://platform.deepseek.com → API Keys
- Tavily (web search): https://tavily.com → free tier available
- GitHub token: https://github.com/settings/tokens → classic token, read/write repo scope

### 4. Run in Development

```bash
npm run dev
```

This starts Vite (React) on port 5173, then launches Electron pointing at it.

### 5. Build for Production

```bash
npm run build
npm run package
```

Output is in the `release/` folder.

---

## Architecture

```
src/
├── main/                    # Electron main process (Node.js)
│   ├── main.ts              # App entry, IPC handlers
│   ├── preload.ts           # Secure bridge to renderer
│   ├── llm/
│   │   └── deepseek.ts      # DeepSeek API client
│   ├── memory/
│   │   ├── database.ts      # SQLite schema + queries (ClaudeMem-style)
│   │   └── manager.ts       # Per-agent memory: inject, record, compress
│   └── agents/
│       ├── base.ts          # BaseAgent class (all agents extend this)
│       ├── boss.ts          # Orchestrator - routing + parallel dispatch
│       ├── researcher.ts    # Rex - web research (Tavily)
│       ├── developer.ts     # Dev - code generation + file ops
│       ├── writer.ts        # Wren - writing + editing
│       ├── analyst.ts       # Ada - data analysis
│       ├── assistant.ts     # Aria - app integrations (GitHub, etc.)
│       └── registry.ts      # Agent lookup map
└── renderer/                # React UI (Vite)
    ├── App.tsx              # Root component + state
    ├── index.css            # Pixel art styles + animations
    └── components/
        ├── OfficeScene.tsx  # Pixel art office layout
        ├── AgentDesk.tsx    # Individual character + desk + speech bubble
        ├── InputPanel.tsx   # Text input to send jobs
        ├── ResultsPanel.tsx # Job output + history
        └── MemoryViewer.tsx # Per-agent memory inspector
```

---

## Memory System (ClaudeMem-style)

Each agent has persistent memory stored in SQLite (`~/.pixel-office-ai/data/memory.db`).

### How it works

1. **Job starts** → Agent's recent summaries + global memory injected into system prompt
2. **During job** → Every tool call, decision, and result saved as an "observation"
3. **Job ends** → DeepSeek compresses observations into a concise summary
4. **Next job** → Summary automatically available to the agent

### Memory tables

| Table | Purpose |
|---|---|
| `sessions` | Every job submitted by the user |
| `observations` | Raw tool calls and decisions per agent |
| `summaries` | AI-compressed session summaries (injected next time) |
| `global_memory` | Shared facts any agent can read/write |
| `observations_fts` | FTS5 full-text search index |
| `summaries_fts` | FTS5 full-text search index |

### Viewing memory

Click any character in the office to open the Memory Viewer panel. You can inspect:
- **Summaries** - Compressed session history
- **Observations** - Raw tool calls and decisions
- **Global** - Shared facts across all agents

---

## The Agents

| Character | Name | Specialty | Personality |
|---|---|---|---|
| Boss | Boss | Routing, orchestration | Sharp, decisive, no-nonsense |
| Researcher | Rex | Web research, fact-finding | Curious, thorough, cites sources |
| Developer | Dev | Code, debugging, scripts | Pragmatic, clean code advocate |
| Writer | Wren | Drafts, emails, copy | Creative, precise, hates jargon |
| Analyst | Ada | Data, CSV, calculations | Data-driven, shows her work |
| Assistant | Aria | GitHub, Gmail, scheduling | Organized, proactive, reliable |

---

## Adding a New Agent

1. Create `src/main/agents/myagent.ts` extending `BaseAgent`
2. Implement the `execute(task, systemPrompt)` method
3. Register in `src/main/agents/registry.ts`
4. Add desk position in `src/renderer/components/OfficeScene.tsx`
5. Add color in `AGENT_COLORS` in `OfficeScene.tsx`

---

## Roadmap

- [ ] Real pixel art sprite sheets with idle/working/done animations
- [ ] Drag and drop files onto agent desks
- [ ] Voice input
- [ ] Gmail integration for Aria
- [ ] Agent-to-agent messaging (visible in the office scene)
- [ ] Job queue / task board view
- [ ] Export results as documents

---

## License

MIT