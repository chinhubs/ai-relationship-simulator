# AI Relationship Simulator

> Digital Persona Relationship Simulator — autonomous AI characters that live, feel, and react.

A web-based simulation platform where you create psychologically-accurate AI personas, run them through a daily life simulation, and observe how they feel, decide, and form relationships over time.

---

## Features

- **Persona Questionnaire** — 3-level intake questionnaire that builds an attachment-theory-based psychological profile for each character
- **Emotion Engine** — 9-dimensional emotional state (happiness, stress, anxiety, loneliness, trust, love, resentment, security, energy) with natural decay and activity effects
- **AI Brain (Decision Engine)** — each tick, the character thinks, decides, and acts using an LLM with their persona as the system prompt
- **Memory System** — 4-layer memory (short-term, episodic, semantic, emotional) that persists across ticks
- **Relationship Manager** — tracks intimacy, trust, conflict score, and interaction history between characters
- **Dialogue Engine** — generates authentic messages/texts the character would actually send, including tone and subtext
- **Daily Routine** — 24-hour schedule with location-aware activity slots (weekday vs weekend)
- **Event Injection** — inject life events (confession, argument, betrayal, gift, ghosting, etc.) at any severity level
- **Diary Entries** — end-of-day journal reflections written in the character's authentic voice
- **Tick-based Simulation** — each tick = 1 hour of sim-time; run manually or auto-advance
- **Canvas World** — visual representation of characters and their world state

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.11+), SQLAlchemy 2.0 async |
| Database | SQLite (dev) / PostgreSQL (prod) |
| AI Brain | OpenAI GPT-4o via async client |
| Frontend | Vanilla JS + HTML5 Canvas |
| Deployment | Docker + Google Cloud Run |

---

## Quick Start

### Prerequisites

- Python 3.11+
- OpenAI API key

### Run Locally

```powershell
cd backend
.\start.ps1
```

The script will:
1. Copy `.env.example` → `.env` (add your `OPENAI_API_KEY`)
2. Create a Python virtual environment
3. Install dependencies
4. Start the server at `http://localhost:8000`

Then open `http://localhost:8000` in your browser.

### Environment Variables

```env
OPENAI_API_KEY=sk-...
DATABASE_URL=sqlite+aiosqlite:///./simulation.db
APP_SECRET_KEY=change_this_to_random_secret
DEBUG=true
```

---

## API Reference

Interactive docs available at `http://localhost:8000/docs`

### Key Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/avatars` | Create a character |
| `GET` | `/api/v1/avatars/{id}/questionnaire` | Get questionnaire questions |
| `POST` | `/api/v1/avatars/{id}/questionnaire` | Submit answers → build persona |
| `POST` | `/api/v1/simulation/control` | Start / pause / stop / tick |
| `POST` | `/api/v1/simulation/{id}/tick` | Manual tick |
| `GET` | `/api/v1/simulation/{id}/state` | Current emotional state |
| `POST` | `/api/v1/events` | Inject an event |
| `POST` | `/api/v1/simulation/{id}/diary` | Generate diary entry |
| `GET` | `/api/v1/relationships/{a}/{b}` | Relationship between two characters |

---

## Project Structure

```
ai-relationship-simulator/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # FastAPI routers
│   │   ├── brain/           # AI decision, dialogue, emotion, memory
│   │   ├── core/            # DB, config, AI client
│   │   ├── models/          # SQLAlchemy models + Pydantic schemas
│   │   ├── questionnaire/   # Persona intake system
│   │   └── simulation/      # Tick engine, daily routine, event processor
│   ├── requirements.txt
│   └── start.ps1
├── frontend/
│   ├── css/style.css
│   ├── js/                  # api.js, renderer.js, simulation.js, ui.js
│   └── index.html
├── deploy/
│   └── gcp_setup.ps1
├── Dockerfile
├── cloudbuild.yaml
└── README.md
```

---

## Deployment (Google Cloud Run)

```powershell
.\deploy\gcp_setup.ps1
```

Or build manually:

```bash
docker build -t ai-relationship-simulator .
docker run -p 8000:8000 --env-file backend/.env ai-relationship-simulator
```

---

## License

MIT
