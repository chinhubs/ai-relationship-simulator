# Changelog

All notable changes to this project will be documented in this file.

---

## [v0.1.0] — 2026-05-02

### Initial Release

First working version of the AI Relationship Simulator.

#### Added

**Backend**
- FastAPI application with async SQLAlchemy (SQLite / PostgreSQL)
- `Character` model with full CRUD — name, nickname, age, occupation, avatar emoji
- 3-level persona questionnaire intake system
- LLM-powered persona analysis: attachment style, personality core, emotional patterns, communication style, conflict behavior, love languages, trigger points, core values, boundaries
- `PersonaProfile` stored per character with calibration versioning
- 9-dimension emotion engine: happiness, stress, anxiety, loneliness, trust, love, resentment, security, energy
- Natural emotion decay toward baseline each tick
- Activity-based emotion effects tied to daily routine slots
- AI Decision Engine — per-tick LLM call that produces internal monologue, decision, action type, and emotion delta
- 4-layer Memory System: short-term, episodic, semantic, emotional
- Relationship Manager: intimacy, trust, conflict score, interaction count, last interaction
- Dialogue Engine — generates authentic character messages with tone and subtext
- Daily routine (weekday + weekend) with location-aware activity slots (06:00–24:00)
- Event Injection system: confession, argument, gift, ghosting, good news, bad news, betrayal, reconciliation, surprise visit — with minor / moderate / major / critical severity
- Emotion snapshots recorded every 4 ticks
- End-of-day diary entry generation in the character's authentic voice
- Feedback / recalibration system for persona tuning
- Tick Engine: 1 tick = 1 sim-hour, with midnight crossover and day counter

**Frontend**
- Responsive 3-panel layout (characters / world canvas / status + events)
- Pixel-art inspired UI with Thai language support
- Character list with add/delete
- Questionnaire modal (3 levels)
- Simulation controls: Start / Pause / Tick / Stop
- Emotion bars panel for selected character
- Event injection form
- Activity log footer
- Canvas world with sprite rendering and speech bubbles

**Deployment**
- Dockerfile for containerized deployment
- Google Cloud Run setup script (`deploy/gcp_setup.ps1`)
- `cloudbuild.yaml` for CI/CD on Google Cloud Build

---

[v0.1.0]: https://github.com/chinhubs/ai-relationship-simulator/releases/tag/v0.1.0
