// script.js

/**
 * Tileworks Studio — Advanced Interactive Engine
 * Features:
 * - Automatic Dynamic Category Generation from links.json
 * - 3D Gyroscopic & Cursor Tilt Physics with Lerp Smoothing
 * - Procedural Synthesizer (Pure Web Audio Ambient Drone + UI Micro-sounds)
 * - Canvas Ember / Stardust Particle Simulation
 * - Web Share API & Built-in SVG QR Code Generator
 * - Logo Click Confetti Celebration
 * - Tactile Haptic Feedback
 */

const CONFIG = {
  defaultLinksJson: 'links.json',
  fallbackItems: [
    {
      title: "Chess",
      image: "chess.svg",
      category: "strategy",
      badge: "CLASSIC",
      url: "https://tileworksgamesstudio.github.io/Chess/"
    },
    {
      title: "Battleships",
      image: "battleships.svg",
      category: "strategy",
      badge: "HOT",
      url: "https://tileworksgamesstudio.github.io/Battleships/"
    },
    {
      title: "Pairs",
      image: "pairs.svg",
      category: "casual",
      badge: "MEMORY",
      url: "https://tileworksgamesstudio.github.io/Pairs/"
    },
    {
      title: "Trivia",
      image: "TRIVIA.svg",
      category: "casual",
      badge: "QUIZ",
      url: "https://tileworksgamesstudio.github.io/Trivia/"
    }
  ],
  audioVolume: 0.32,
  haptics: {
    light: 10,
    medium: 22,
    heavy: [20, 40, 20],
    celebration: [10, 30, 20, 40, 10, 50]
  }
};

let allMenuItems = [];
let activeCategory = 'all';

/* ==========================================================================
   1. Haptic Engine
   ========================================================================== */
function triggerHaptic(type = 'light') {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      const pattern = CONFIG.haptics[type] || CONFIG.haptics.light;
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignored if restricted by device
    }
  }
}

/* ==========================================================================
   2. Procedural Web Audio Synthesizer & Sound Manager
   ========================================================================== */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.ambientNodes = [];
    this.bgAudio = document.getElementById('bg-audio');
    this.hasExternalAudio = false;
  }

  init() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx && !this.ctx) {
      this.ctx = new AudioCtx();
    }
  }

  async resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // Pure Web Audio ambient soothing drone (Fallbacks if no external file)
  startProceduralAmbient() {
    if (!this.ctx || this.ambientNodes.length > 0) return;

    const chords = [130.81, 196.00, 261.63, 329.63]; // C - G - C - E ethereal chord
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.05, this.ctx.currentTime + 3);

    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Gentle detuning for shimmer
      osc.detune.setValueAtTime((idx - 1.5) * 5, this.ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(masterGain);
      osc.start();

      this.ambientNodes.push(osc);
    });

    masterGain.connect(this.ctx.destination);
    this.ambientGain = masterGain;
  }

  stopProceduralAmbient() {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);
      setTimeout(() => {
        this.ambientNodes.forEach(node => {
          try { node.stop(); node.disconnect(); } catch (e) {}
        });
        this.ambientNodes = [];
      }, 850);
    }
  }

  // Crisp Procedural UI Micro Sounds
  playUiSound(freq = 560, duration = 0.05, type = 'sine', slideTo = 240) {
    if (this.isMuted) return;
    try {
      this.resumeContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration + 0.01);
    } catch (e) {}
  }

  playHoverTick() {
    this.playUiSound(720, 0.03, 'sine', 550);
  }

  playClickSnap() {
    this.playUiSound(880, 0.06, 'triangle', 200);
  }

  playSuccessChime() {
    if (this.isMuted) return;
    this.playUiSound(523.25, 0.1, 'sine', 659.25);
    setTimeout(() => this.playUiSound(783.99, 0.15, 'sine', 1046.5), 90);
  }

  async toggleAudio() {
    await this.resumeContext();
    this.isMuted = !this.isMuted;

    const equalizer = document.getElementById('equalizer');
    const statusLabel = document.getElementById('audio-status');

    if (!this.isMuted) {
      // Try playing HTML5 Audio element first
      let played = false;
      if (this.bgAudio) {
        try {
          this.bgAudio.volume = CONFIG.audioVolume;
          await this.bgAudio.play();
          played = true;
          this.hasExternalAudio = true;
        } catch (err) {
          played = false;
        }
      }

      // If no file, activate procedural synthesizers
      if (!played) {
        this.startProceduralAmbient();
      }

      equalizer.classList.add('playing');
      statusLabel.textContent = 'ON';
      showToast('Sound activated');
    } else {
      if (this.bgAudio && this.hasExternalAudio) {
        this.bgAudio.pause();
      }
      this.stopProceduralAmbient();
      equalizer.classList.remove('playing');
      statusLabel.textContent = 'OFF';
      showToast('Sound muted');
    }

    localStorage.setItem('tileworks_sound_pref', this.isMuted ? 'false' : 'true');
  }
}

const sounds = new SoundEngine();

/* ==========================================================================
   3. Ambient Particle Canvas Engine (Stardust & Embers)
   ========================================================================== */
function initAmbientCanvas() {
  const canvas = document.getElementById('ambient-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particleCount = Math.min(Math.floor(width * 0.05), 45);
  const particles = [];

  class Particle {
    constructor() {
      this.reset(true);
    }
    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 10;
      this.size = Math.random() * 2 + 0.8;
      this.speedY = Math.random() * 0.45 + 0.15;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.5 + 0.2;
      this.color = Math.random() > 0.4 ? '212, 163, 89' : '255, 216, 138';
    }
    update() {
      this.y -= this.speedY;
      this.x += this.speedX;
      if (this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.reset();
      }
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(${this.color}, 0.8)`;
      ctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

/* =================================================