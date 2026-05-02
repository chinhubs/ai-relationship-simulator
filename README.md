# AI Relationship Simulator

> **v1.4.0** — Digital Persona Relationship Simulator — autonomous AI characters that live, feel, and react in a pixel art isometric city.

A web-based simulation platform where you create psychologically-accurate AI personas, run them through a daily life simulation, and observe how they feel, decide, and form relationships over time — all inside a living, animated pixel art world.

---

## What's New in v1.4.0

- **Pixel Art Isometric City** — full 2.5D top-down RPG-style world (Stardew Valley aesthetic), rendered on an offscreen 400×200 canvas scaled 2× for crisp pixel blocks
- **Living City** — 15+ buildings (mall, hospital, bank, gas station, office, houses), animated road with moving cars, background NPCs with waypoint AI, trees, sky gradient with stars/sun
- **Emotion Overlays** — dominant emotion icons float above characters in the scene (😊 😰 💕 …), speech bubbles pop up when characters send messages, interaction hearts animate between characters
- **Character Types** — 9 types: บุคคลทั่วไป, แฟน/คู่รัก, พ่อ/แม่, ปู่/ย่า/ตา/ยาย, ครู/อาจารย์, หัวหน้า, เพื่อนร่วมงาน, เพื่อน, สัตว์เลี้ยง — each type shapes the AI persona system prompt and form fields adapt dynamically (pets hide relationship status, change gender labels, use 0–20 age range)
- **Activity Log vs Daily Timeline redesign** — left panel shows only notable events (messages, confessions, arguments); right panel shows full day-by-day timeline with character filter tabs
- **Ambient Music** — Web Audio API generative background score

---

## Features

### Simulation Core
- **Persona Questionnaire** — 3-level intake questionnaire (10–35 questions) that builds an attachment-theory-based psychological profile for each character
- **Emotion Engine** — 9-dimensional emotional state (happiness, stress, anxiety, loneliness, trust, love, resentment, security, energy) with natural decay and activity-based modifiers
- **AI Brain (Decision Engine)** — each tick, the character thinks, decides, and acts using an LLM with their full persona as the cached system prompt
- **Memory System** — 4-layer memory (short-term, episodic, semantic, emotional) that persists across ticks
- **Relationship Manager** — tracks closeness, trust, conflict score, attraction, communication quality, and interaction history between any pair of characters
- **Dialogue Engine** — generates authentic messages/texts the character would actually send, including tone and subtext
- **Daily Routine** — 24-hour schedule with location-aware activity slots (weekday vs weekend patterns)
- **Event Injection** — inject life events (confession, argument, betrayal, gift, ghosting, reconciliation, surprise visit, etc.) at four severity levels
- **Diary Entries** — end-of-day journal reflections written in the character's voice
- **Tick-based Simulation** — 1 tick = 1 hour of sim-time; run manually or auto-advance (8 s/tick)

### Visual World
- **Pixel Art Isometric City** — 2.5D offscreen canvas rendering with `imageSmoothingEnabled: false`, integer-only coordinates
- **15+ City Buildings** — ห้างสรรพสินค้า, โรงพยาบาล, ธนาคาร, ปั๊มน้ำมัน, ตึกทำงาน, บ้านพัก x4, คาเฟ่, สวน, สนามกีฬา, โรงแรม
- **Moving Cars** — 6 animated pixel cars on horizontal and vertical roads
- **Background NPCs** — 6 ambient townspeople navigating waypoints around the city
- **Character Sprites** — pixel art avatars positioned at location-matched coordinates on the map
- **Emotion Overlays** — floating emotion icons, speech bubbles, interaction particles — all drawn at 2× scale on the main canvas

### Character Types (v1.4.0)
| Type | Thai | Notes |
|---|---|---|
| human | บุคคลทั่วไป | default |
| partner | แฟน/คู่รัก | romantic relationship |
| parent | พ่อ/แม่ | age 30–75 |
| grandparent | ปู่/ย่า/ตา/ยาย | age 55–95 |
| teacher | ครู/อาจารย์ | age 25–65 |
| boss | หัวหน้า | age 28–65 |
| coworker | เพื่อนร่วมงาน | age 20–55 |
| friend | เพื่อน | age 10–70 |
| pet | สัตว์เลี้ยง 🐾 | age 0–20, no relationship status, species field |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.11+), SQLAlchemy 2.0 async |
| Database | SQLite (dev) / PostgreSQL (prod) |
| AI Brain | OpenAI GPT-4o / Claude via async client |
| Frontend | Vanilla JS + HTML5 Canvas (offscreen pixel art renderer) |
| Audio | Web Audio API (generative ambient) |
| Deployment | Docker + Google Cloud Run |

---

## Quick Start

### Prerequisites

- Python 3.11+
- OpenAI API key (or compatible endpoint)

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

## How to Use

1. **Create characters** — click `+ เพิ่มตัวละคร`, pick a type (human / pet / parent / etc.), fill in name, age, occupation/species, personality notes
2. **Build persona** — click 📋 on a character card → take the questionnaire → AI builds a psychological profile
3. **Start the world** — click `▶ เริ่ม` to auto-advance time; or `⏭ Tick` to step manually
4. **Inject events** — use the right panel form to inject events (argument, confession, gift…) at any severity
5. **Watch the city** — characters move between locations on the isometric map; emotion icons and speech bubbles appear in real time
6. **Review logs** — bottom-left panel shows notable events only; bottom-right shows full day-by-day timeline filterable by character

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
│   │   ├── api/routes/      # FastAPI routers (avatars, simulation, events…)
│   │   ├── brain/           # AI decision, dialogue, emotion, persona, memory
│   │   ├── core/            # DB engine, config, AI client, migrations
│   │   ├── models/          # SQLAlchemy models + Pydantic schemas
│   │   ├── questionnaire/   # Persona intake system
│   │   └── simulation/      # Tick engine, daily routine, event processor
│   ├── requirements.txt
│   └── start.ps1
├── frontend/
│   ├── css/style.css
│   ├── js/
│   │   ├── api.js           # API client
│   │   ├── audio.js         # Ambient music (Web Audio API)
│   │   ├── renderer.js      # Pixel art isometric city renderer
│   │   ├── simulation.js    # Tick loop controller
│   │   ├── ui.js            # DOM helpers, forms, timeline, character types
│   │   ├── main.js          # App bootstrap
│   │   └── config.js
│   └── index.html
├── deploy/
│   └── gcp_setup.ps1
├── Dockerfile
├── cloudbuild.yaml
└── README.md
```

---

## Changelog

### v1.4.0 — Pixel Art City + Character Types
- Rewrite renderer to pixel art isometric 2.5D style (offscreen 400×200 → 2× upscale)
- 15+ buildings, animated cars, NPC waypoint system, day/night sky
- Emotion overlay system: floating icons, speech bubbles, interaction hearts
- Character types (9 types) with type-specific AI persona context, dynamic form fields, card badges
- Activity log + daily timeline redesign: notable-events-only feed vs full day timeline with character filter tabs

### v1.3.0 — Music & Notable Events
- Ambient background music via Web Audio API
- Notable event filtering in activity log (only meaningful events shown)

### v1.2.0 — Daily Timeline & Sim Clock
- Structured daily timeline with day grouping and DOW headers
- Animated sim clock with period indicators (🌅 🌆 🌙)

### v1.1.0 — Extended Profiles
- Extended character profile: daily routine, hobbies, work details, living situation
- Persistent daily activity log

### v1.0.0 — Initial Release
- Core simulation engine, persona questionnaire, emotion + memory + relationship systems

---

## License

MIT
