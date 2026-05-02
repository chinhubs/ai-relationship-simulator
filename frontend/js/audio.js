/**
 * Ambient music generator — cozy life-sim style (Web Audio API, no files needed).
 * Generates a gentle, random pentatonic melody with soft tones.
 */

class AmbientMusic {
  constructor() {
    this.ctx    = null;
    this.master = null;
    this.isPlaying = false;
    this._timer = null;

    // C major pentatonic — warm, non-dissonant
    this._hi = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
    // Soft bass roots
    this._lo = [65.41, 98.00, 130.81];
  }

  _init() {
    if (this.ctx) return;
    this.ctx    = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
  }

  _tone(freq, when, dur, vol, type = "sine") {
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.master);

    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value    = (Math.random() - 0.5) * 5; // slight humanisation

    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(vol, when + 0.1);       // soft attack
    gain.gain.setValueAtTime(vol, when + dur * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  _schedule() {
    if (!this.isPlaying) return;
    const now = this.ctx.currentTime;

    // Melody note
    const freq = this._hi[Math.floor(Math.random() * this._hi.length)];
    const dur  = 1.8 + Math.random() * 2.5;
    this._tone(freq, now, dur, 0.16);

    // Occasional harmony (a 5th)
    if (Math.random() > 0.55) {
      this._tone(freq * 1.5, now + 0.08, dur * 0.75, 0.07);
    }

    // Occasional soft bass note
    if (Math.random() > 0.65) {
      const bass = this._lo[Math.floor(Math.random() * this._lo.length)];
      this._tone(bass, now + 0.15, dur + 1.2, 0.09);
    }

    // Schedule next note: 1.5 – 4 seconds later
    this._timer = setTimeout(() => this._schedule(), 1500 + Math.random() * 2500);
  }

  start() {
    this._init();
    if (this.ctx.state === "suspended") this.ctx.resume();
    if (this.isPlaying) return;
    this.isPlaying = true;
    // Fade in over 2 s
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(0, this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0.13, this.ctx.currentTime + 2);
    this._schedule();
    this._updateBtn(true);
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setValueAtTime(this.master.gain.value, this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
    }
    this._updateBtn(false);
  }

  toggle() {
    if (this.isPlaying) this.stop();
    else this.start();
  }

  _updateBtn(playing) {
    const btn = document.getElementById("btn-music");
    if (btn) {
      btn.textContent = playing ? "🔇" : "🎵";
      btn.title       = playing ? "ปิดดนตรี" : "เปิดดนตรี";
      btn.classList.toggle("music-on", playing);
    }
  }
}

const music = new AmbientMusic();
