# Curiosity Machine 🌌

> **An AI-powered knowledge exploration platform that turns any topic into a living, interactive knowledge universe.**

Curiosity Machine transforms linear text search into a visual, interconnected cosmos of ideas. Users enter any concept they are curious about (e.g., *"octopus intelligence"*, *"quantum entanglement"*, *"why is the sky blue"*), and watch a universe of stars, nebulae, and filaments unfold before their eyes.

Explore deeply, discover surprising rabbit holes, trace conceptual bridges between seemingly unrelated worlds, and build a persistent personal curiosity map.

---

## ✨ Features

1. **Topic → Universe**: Deconstructs any topic into 6–8 rich, related concepts categorized into distinct knowledge domains (Science, Nature, History, Art, Tech, Math, Philosophy, Society) with typed, explained connections.
2. **The Observatory Metaphor**:
   - **Concepts as Stars**: Star size indicates exploration depth; recency dictates brilliance; unexplored stars emit pulsing signal rings (fog of war).
   - **Domains as Nebulae**: Soft blurred color clouds group related concepts into natural knowledge clusters.
   - **Connections as Threads of Light**: Bézier lines with domain gradient styling encode relational meanings (*causes*, *part of*, *analogous to*, *contrasts with*, *inspired*, *origin of*, *applies to*).
   - **Comet Trail**: Chronological filmstrip tracks your journey and replays it across the sky.
   - **Semantic Zoom**: Zoom out to see overarching galaxy domains; zoom in to reveal star-level detail cards and summaries.
3. **Depth Lens (4 Levels of Understanding)**:
   - **Simple**: Intuitive, vivid explanations.
   - **Student**: Core foundations and structural mechanics.
   - **Undergrad**: Technical nuance, mathematical and scientific rigor.
   - **Expert**: Frontiers, open problems, and paradoxes.
4. **Rabbit Hole Discovery**:
   - AI identifies distant-yet-genuinely-connected concepts maximizing *relevance × unexpectedness*.
   - Features a **Surprise Meter** and one-line teaser.
   - **Warp Travel**: Seamless camera acceleration easing towards your destination star.
5. **Bridge Finder**: Pick any two distant concepts (e.g., *"Mycelium Networks"* and *"Internet Routing"*); the AI discovers a factually grounded 3–5 hop narrative bridge.
6. **Wikipedia Grounding & Fallback**:
   - Auto-verifies concepts against the free Wikipedia REST/OpenSearch API, awarding verified status and linking encyclopedic sources.
   - **Degraded Mode**: If Gemini API quota is depleted or absent, the platform automatically switches to Wikipedia link extraction, remaining 100% operational.
7. **Personal Curiosity Map**:
   - Filter concepts by domain, search within charted knowledge, filter starred concepts, and record personal notes.
   - Persisted both on the server (keyed by anonymous device ID) and client-side (IndexedDB for instant offline access).
8. **Curiosity Profile (Spotify-Wrapped Style)**:
   - Generates an SVG radar chart of domain distribution, computes your explorer archetype (e.g. *Wide Wanderer*, *Abyssal Diver*, *Constellation Weaver*), highlights blind spots, and exports a high-resolution PNG share card.
9. **Two Visual Themes**:
   - **Observatory (Dark)**: Deep space palette with radial atmosphere, glowing filaments, and cosmic nebulae.
   - **Atlas (Light)**: Cartographic warm parchment, ink filaments, and desaturated hues.
10. **Command Palette & Accessibility**:
    - `Cmd/Ctrl+K` command palette for keyboard-first navigation.
    - Full screen-reader friendly **Accessible List View** (`List` button or `Cmd+K`).
    - Standard keyboard shortcuts (`E` expand, `R` rabbit hole, `B` bridge, `[` `]` trail, `F` fit view).

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand (state & offline persistence), D3-Force (canvas simulation), Lucide React, CMD-K, HTML-to-Image.
- **Backend**: Python 3.11+, FastAPI, SQLite with WAL mode & SQLAlchemy 2.0 (async), Google GenAI SDK (`google-genai`), HTTPX, SlowAPI rate limiting.
- **Testing & Quality**: Pytest with async fixtures, Vitest, Ruff, Mypy, Oxlint.

---

## 🚀 Quickstart & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### 1. Clone & Configure Environment
```bash
git clone https://github.com/your-username/Curiosity_machine.git
cd Curiosity_machine

# Copy environment template
cp .env.example .env
```

Edit `.env` to configure your free Google AI Studio key:
```env
# Optional: If left blank or quota exhausted, app gracefully runs in Degraded Wikipedia Mode
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
DATABASE_URL=sqlite+aiosqlite:///./curiosity.db
HOST=127.0.0.1
PORT=8000
```

### 2. Start the Backend API
```bash
# In project root or api/ directory
pip install -r api/requirements.txt

# Run FastAPI server
uvicorn api.app.main:app --reload --port 8000
```
Backend API will be running at: `http://127.0.0.1:8000` (Docs: `http://127.0.0.1:8000/docs`).

### 3. Start the Frontend App
```bash
cd web
npm install
npm run dev
```
Frontend will be running at: `http://localhost:5173`.

---

## 🧪 Verification & Testing

Curiosity Machine follows strict quality and correctness protocols:

### Run Backend Tests (pytest)
```bash
python -m pytest api/tests
```

### Run Backend Lint & Typecheck
```bash
python -m ruff check api
python -m mypy api
```

### Run Frontend Tests (Vitest)
```bash
cd web
npm run test
```

### Run Frontend Lint & Build
```bash
cd web
npm run lint
npm run build
```

---

## 🌐 Free Tier Deployment Guide

### Frontend (Vercel / Cloudflare Pages / Netlify)
1. Push repository to GitHub.
2. Link the `/web` directory as root directory on Vercel or Cloudflare Pages.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Configure environment variable: `VITE_API_URL` pointing to your deployed backend.

### Backend (Render / Fly.io / Hugging Face Spaces)
1. Deploy `/api` on Render (Web Service) or Fly.io with a persistent volume mounted for `curiosity.db`.
2. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add environment variables: `GEMINI_API_KEY`, `GEMINI_MODEL`.

---

## 🛡 Quota & Rate Limit Discipline
- **Single LLM call per action**: Never fans out calls.
- **SQLite Deterministic Caching**: Repeated queries return in 0ms at 0 API cost.
- **Exponential Backoff & Jitter**: Automatic retry on HTTP 429 without exposing raw errors to the user.
- **Degraded Fallback Mode**: Gracefully navigates topics using Wikipedia's knowledge graph if quota is exhausted.

---

## 📄 License
MIT License. Built with curiosity.
