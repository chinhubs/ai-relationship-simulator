# Changelog

All notable changes to AI Relationship Simulator are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [v3.0.0] — 2026-05-03

### Added
- **Complete 4-Layer Memory System**
  - Short-term buffer (cap 20), episodic (cap 80), semantic (cap 40), emotional (permanent/never pruned)
  - Gap-fill routine memory: every tick stores at least one record even when AI returns nothing
  - Auto-promote to episodic when `max_emotion_delta ≥ 10`
  - Growth reflections stored to semantic layer
  - `update_memory_access()`: bumps `access_count` and reinforces `importance_score` (+0.05) every 5 recalls
  - `create_daily_summary()`: midnight compaction — short-term memories collapsed into one episodic diary entry, raw short-term deleted
  - `prune_old_memories()`: enforces episodic (80) and semantic (40) caps after daily summary

- **Thai Buddhist Era Calendar**
  - `simDayToDate(simDay)` global helper: Day 1 = Sunday 5 January 2025 (5 ม.ค. 2568 BE)
  - `SIM_START_DATE`, `_MONTHS_SHORT/FULL`, `_DOW_SHORT/FULL` arrays in `config.js`
  - Timeline headers: `วันอาทิตย์ที่ 5 ม.ค. 2568`
  - Log timestamps: `🌅 อา. 5 ม.ค. 08:00`
  - Clock bar: `อา. 5 ม.ค. 2568 · 🌅 เช้า · 08:00 น.`
  - State panel date badge: `อา. 5 ม.ค. 2568`

- **Pet Multi-Color Fur (up to 3 colors)**
  - Picker uses `data-field="body_colors" data-multi="3"` — toggle up to 3 swatches
  - `_collectAppearance()` returns array for multi fields
  - `_ensureCharTextures` reads `body_colors[]` (backward compatible with `body_color`)
  - All 5 species sprite generators accept `spot` and `spot2` params; patches drawn on body + head

- **Clickable Indoor Characters**
  - `_spawnChars` in `IndoorScene` calls `setInteractive()` + `pointerup` on sprite and name label
  - Opens status panel for the clicked character

- **AI Cost Optimizations**
  - `persona_core.py`: 5-min TTL in-memory cache (`_persona_cache`) — avoids DB round-trip each tick; benefits from OpenAI server-side prefix caching for prompts >1024 tokens
  - `tick_engine.py`: `_should_skip_ai()` returns `True` on every other routine tick when no events and all key emotions within [15, 85] — approximately halves API calls on quiet days
  - `_routine_decision()` no-op fallback used on skipped ticks
  - Token usage tracking end-to-end: `_call_with_fallback` returns `(text, usage_dict)` with `prompt_tokens`, `completion_tokens`, `total_tokens`, `cached_tokens`; usage propagated through `call_brain` → decision/dialogue engines via `_token_usage` key → accumulated in `_tick_usage` → written to `SimulationTick.token_usage`

### Fixed
- **`is_weekend()` formula** — `(sim_day % 7) in (6, 0)` incorrectly treated Friday as weekend and Sunday as weekday; corrected to `(sim_day % 7) in (0, 1)` (0 = Saturday, 1 = Sunday)
- **Clock midnight overflow** — single `if totalMin >= 1440: totalMin -= 1440` only handled one boundary; replaced with `Math.floor(totalMin / 1440)` for correct multi-day advance

---

## [v2.0.0] — 2026-05-02

### Added
- **Character Appearance Customization** — visual swatch picker in create/edit form: shirt (12), pants (8), hair color (10), hair style (สั้น/ยาว/มวยผม) for humans; coat (8), eye color (6) for pets; saved to `profile_extra.appearance`
- **Per-Character Phaser Textures** — unique texture per character (`char_{id}_r/l_m/f`, `pet_{id}_r/l`) generated from saved appearance instead of shared 6-slot palette
- **Hair Style Sprites** — `_genSprite` supports three distinct shapes: `short`, `long`, `bun`
- **Mobile Pinch-to-Zoom** — `IsoScene` and `IndoorScene` respond to two-finger pinch on iOS/Android; `input.activePointers: 2` + `touch-action: none`
- **Pet Species Sprites** — 5 distinct species renderers (cat, dog, rabbit, hamster, bird) with separate coat/eye/spot variants
- **Expanded Color Palette** — 28-color swatch palette across all picker sections
- **Thai Activity Log** — activity descriptions written in Thai throughout the tick summary

### Changed
- Indoor scene: removed permanent activity text labels; name tag (emoji + name) only; timed emotion bursts and speech bubbles still appear

---

## [v1.9.0] — 2026-04-xx

### Added
- Hamburger menu collapses side panels into slide-out drawer on narrow screens
- Dark amber pixel art theme (`--accent: #d4a843`, `--accent-2: #f0c060`)
- Indoor scene mouse-wheel zoom (0.4×–3.0×) and drag pan

### Fixed
- Building label filter: exact-match before substring to prevent wrong building selection
- Emotion burst system: icons fly up then auto-destroy (replaces always-on overlay)

---

## [v1.8.0] — 2026-04-xx

### Added
- `personalise_work_slot()`: maps occupation/work_details to actual workplace (hospital, mall, café, bank, school, gym, etc.)
- Day+id seeded RNG for stable same-day WFH decisions across ticks

### Fixed
- Emotion icons always display above outdoor characters; lowered thresholds, full fallback cascade, dark pill backgrounds
- Name labels redesigned: avatar emoji prefix, 11 px font, pill background, correct y-offset
- Indoor label y-offset: 2× scaled sprites (48 px) now have labels correctly above head (−56/−44 px)
- Speech bubble text enlarged 7 px → 9 px

---

## [v1.7.0] — 2026-04-xx

### Added
- `IndoorScene` Phaser scene: building click transitions from outdoor `IsoScene` to fully rendered indoor view
- 13 building type floor plans with pixel art furniture (beds, sofas, TVs, kitchen counters, treadmills, hospital beds, gas pumps, etc.)
- Characters wander within keyword-matched rooms; name + activity labels update in real time
- `← กลับ` button: `scene.stop()` / `scene.wake()` seamless transition back to outdoor scene

---

## [v1.6.0] — 2026-04-xx

### Added
- Type-aware daily schedules: `PET_SCHEDULE` (home-only), `GRANDPARENT_SCHEDULE`, AI behavioral rules per character type
- Camera: mouse-wheel zoom, drag pan, double-click reset
- Building room detail popup: keyword-matched character-to-room grid
- Character-on-car: sprite rides animated car with floating name tag

### Fixed
- Isometric depth formula unified for characters, NPCs, buildings — no more rooftop floating
- NPC sidewalk corridor routing via four dedicated corridors and junction waypoints
- Profile form: pet fields for pets, human fields for others; dynamic section switch on type change; `flag_modified` for JSON saves

---

## [v1.5.0] — 2026-04-xx

### Added
- Indoor/outdoor character visibility: sprites fade into buildings, floating name tags appear
- Follow mode: 🎯 button tracks character with pulsing gold ring + auto info-panel updates
- Building click popup: occupants, activity, Follow shortcut
- Pet sprite: dedicated pixel-art cat-style sprite replacing human sprite
- Pet profile form: species, breed, energy, temperament, likes/fears, training, bond
- Responsive design: 4 breakpoints (1200/960/768/480px)

### Fixed
- Clock no longer jumps between characters' times
- Daily activity log always writes even when renderer throws
- Sim-time null guard prevents crashes

---

## [v1.4.0] — 2026-04-xx

### Added
- Pixel art isometric 2.5D city renderer (Phaser 3.80.1, pixelArt mode, 800×450 canvas)
- 15+ buildings, animated cars, NPC waypoint AI, day/night sky gradient with stars/sun
- Emotion overlay system: floating icons, speech bubbles, interaction hearts
- 9 character types with type-specific AI persona context and dynamic form fields
- Activity log (notable events only) + daily timeline with character filter tabs

---

## [v1.3.0] — 2026-04-xx

### Added
- Ambient background music via Web Audio API
- Notable event filtering in activity log

---

## [v1.2.0] — 2026-04-xx

### Added
- Structured daily timeline with day grouping and DOW headers
- Animated sim clock with period indicators (🌅 🌆 🌙)

---

## [v1.1.0] — 2026-04-xx

### Added
- Extended character profile: daily routine, hobbies, work details, living situation
- Persistent daily activity log

---

## [v1.0.0] — 2026-04-xx

### Added
- Core simulation engine, persona questionnaire, emotion + memory + relationship systems
- FastAPI backend, SQLite/PostgreSQL, async SQLAlchemy
- 9-dimension emotion engine with decay and activity modifiers
- AI Decision Engine, Dialogue Engine, Memory System, Relationship Manager
- Event injection system (10 event types × 4 severity levels)
- Diary entry generation
- Docker + Google Cloud Run deployment

---

[v3.0.0]: https://github.com/chinhubs/ai-relationship-simulator/releases/tag/v3.0.0
[v2.0.0]: https://github.com/chinhubs/ai-relationship-simulator/releases/tag/v2.0.0
[v1.0.0]: https://github.com/chinhubs/ai-relationship-simulator/releases/tag/v1.0.0
