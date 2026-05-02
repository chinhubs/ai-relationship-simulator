# AI Relationship Simulator

> **v1.7.0** — Digital Persona Relationship Simulator — autonomous AI characters that live, feel, and react in a pixel art isometric city.

A web-based simulation platform where you create psychologically-accurate AI personas, run them through a daily life simulation, and observe how they feel, decide, and form relationships over time — all inside a living, animated pixel art world.

---

## What's New in v1.7.0

- **Real Indoor Phaser Scene** — clicking a building label now launches a full `IndoorScene` (a second Phaser scene) instead of an HTML popup; the outdoor city sleeps, the indoor view wakes with pixel art rooms, drawn furniture, and your characters as walking sprites
- **Room Layouts for 13 Building Types** — each building type (house, office, cafe, restaurant, mall, hospital, bank, gym, park, BTS, store, gas) has a dedicated floor plan with type-appropriate rooms (bedroom/bathroom/kitchen/living room for houses; workstations + conference room for office; etc.)
- **Pixel Art Furniture** — each room is furnished with hand-drawn shapes: beds, sofas, TVs, kitchen counters with stove burners, conference tables, treadmills, locker rows, hospital beds, gas pumps, shelves, and more
- **Characters Walk Around Inside** — sprites are placed in their keyword-matched room and smoothly wander to random targets within room bounds; they face left/right as they move; name + current activity labels float above each character
- **← กลับ Button** — returns to the outdoor isometric city; IsoScene wakes and resumes exactly where it left off

## What's New in v1.6.0

- **Correct Isometric Depth** — characters and NPCs now use the same depth formula as buildings (`(py − OY) × 2000 / TH`), so they properly appear behind or in front of buildings instead of floating on rooftops
- **NPC Corridor Routing** — background NPCs navigate via four dedicated sidewalk corridors (c6, c8, r5, r7) with junction waypoints; they no longer cut diagonally through buildings
- **Type-Aware Daily Schedule** — pets follow a home-only 24-hour schedule (`PET_SCHEDULE`); grandparents follow a retirement schedule (`GRANDPARENT_SCHEDULE`); AI behavioral rules prevent pets from commuting, working, or leaving home
- **Scene Camera Controls** — mouse wheel to zoom (0.75×–2.5×), drag to pan, double-click to reset to default view
- **Building Room Detail** — click any building label to open a room-grid popup: rooms are shown with which characters are currently inside and their activity, matched by keyword
- **Character-on-Car** — characters whose activity involves driving/commuting ride the animated car sprite; a floating `🚗 name` tag follows the car
- **Profile Save Fixed** — edit form now shows pet-specific fields (species, breed, energy, temperament…) for pet characters and human fields for everyone else; switching character type dynamically re-renders the section; `flag_modified` ensures SQLAlchemy always persists JSON profile data; pet profile form now refreshes in-memory character list after saving

## What's New in v1.5.0

- **Indoor/Outdoor Visibility** — characters physically enter buildings: sprites fade out as they walk in, a floating name tag appears above the building; clicking the building label shows who's inside and what they're doing
- **Follow Character** — 🎯 button on each character card attaches a pulsing gold ring to that character in the scene and auto-updates their info panel every tick; click again to unfollow
- **Building Click Detail** — click any building label in the scene to see which characters are currently inside, their activity, and a Follow shortcut
- **Pet Sprites** — pets now render as pixel-art cat/animal sprites (body, ears, tail, paws, eyes, whiskers) in 6 colour variants instead of reusing the human sprite
- **Pet Profile Form** — dedicated intake form for pets (species, breed, energy level, temperament, likes, fears, training level, owner bond, special behaviours) replacing the human questionnaire
- **Simulation Bug Fixes** — clock no longer jumps between characters' times; daily activity log always writes even when renderer throws; simulation-time null guard prevents crashes
- **Responsive Design** — 4 breakpoints (1200px / 960px / 768px / 480px): side panels collapse to icon-only at tablet width, stack vertically on mobile, canvas scales to full width

## What's New in v1.4.0

- **Pixel Art Isometric City** — full 2.5D top-down RPG-style world (Stardew Valley aesthetic), rendered with Phaser 3.80.1 + pixelArt mode on an 800×450 canvas
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

### v1.7.0 — Real Indoor Phaser Scene
- `IndoorScene` Phaser scene: clicking a building transitions from the outdoor `IsoScene` (sleeps) to a fully rendered indoor top-down view
- 13 building type floor plans: dedicated room layouts with pixel art furniture drawn via Phaser Graphics
- Character sprites wander within their keyword-matched room; name + activity labels update in real time
- `← กลับ` button returns to the outdoor scene seamlessly via `scene.stop()` / `scene.wake()`

### v1.6.0 — Depth Fix + Camera Controls + Profile Save + NPC Routing + Pet Schedules
- Isometric depth formula unified for characters, NPCs, and buildings — no more rooftop floating
- NPC sidewalk corridor routing via four dedicated corridors and junction waypoints
- Type-aware daily schedules: `PET_SCHEDULE` (home-only), `GRANDPARENT_SCHEDULE`, plus AI behavioral rules per character type
- Camera: mouse-wheel zoom, drag pan, double-click reset
- Building room detail popup: keyword-matched character-to-room assignment in a 2-column grid
- Character-on-car: sprite rides animated car, floating name tag follows
- Profile form: pet fields shown for pets, human fields for others, dynamic section switch on type change, `flag_modified` ensures JSON saves, pet form reloads character list after save

### v1.5.0 — Indoor/Outdoor System + Follow + Pet Overhaul + Responsive
- Indoor/outdoor character visibility: sprites fade into buildings, floating name tags appear above; click building label to see who's inside
- Follow mode: 🎯 button tracks any character with a pulsing ring + auto info-panel updates
- Building click popup: shows current occupants, activity, and Follow button per character
- Pet sprite: dedicated pixel-art animal sprite (cat-style with ears/tail/paws/whiskers) replacing human sprite
- Pet profile form: species, breed, energy level, temperament, likes/fears, training, owner bond
- Simulation fixes: clock no longer jumps between characters, daily log always writes, renderer exceptions isolated
- Responsive design: 4-breakpoint layout (1200/960/768/480px) with icon-collapse and mobile-stack modes

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
