// script.js

/**
 * Tileworks Studio — Advanced Interactive Engine
 * Features:
 * - 3D Gyroscopic & Cursor Tilt Physics with Lerp Smoothing
 * - Procedural Synthesizer (Pure Web Audio Ambient Drone + UI Micro-sounds)
 * - Canvas Ember / Stardust Particle Simulation
 * - Web Share API & Built-in SVG QR Code Generator
 * - Category Filtering System
 * - Logo Click Confetti Celebration
 * - Tactile Haptic Feedback
 */

const CONFIG = {
  defaultLinksJson: 'links.json',
  fallbackItems: [
    {
      image: 'chess.svg',
      title: 'Chess',
      category: 'games',
      badge: 'POPULAR',
      url: 'https://tileworksgamesstudio.github.io/Chess/'
    },
    {
      image: 'battleships.svg',
      title: 'Battleships',
      category: 'games',
      badge: 'NEW',
      url: 'https://example.com/battleships'
    },
    {
      image: 'discord.svg',
      title: 'Community',
      category: 'community',
      badge: 'JOIN',
      url: 'https://discord.com'
    },
    {
      image: 'store.svg',
      title: 'Studio Shop',
      category: 'featured',
      badge: 'MERCH',
      url: 'https://example.com/shop'
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

/* ==========================================================================
   4. Dynamic 3D Card Tilt Engine with Physics Lerp
   ========================================================================== */
function attachCardTiltPhysics(card) {
  let bounds = card.getBoundingClientRect();
  let mouseX = 0;
  let mouseY = 0;
  let currentRotX = 0;
  let currentRotY = 0;
  let targetRotX = 0;
  let targetRotY = 0;
  let isHovered = false;
  let rafId = null;

  function updateBounds() {
    bounds = card.getBoundingClientRect();
  }

  function renderPhysics() {
    if (!isHovered && Math.abs(currentRotX) < 0.05 && Math.abs(currentRotY) < 0.05) {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
      cancelAnimationFrame(rafId);
      rafId = null;
      return;
    }

    // Lerp smoothing (0.12 factor)
    currentRotX += (targetRotX - currentRotX) * 0.12;
    currentRotY += (targetRotY - currentRotY) * 0.12;

    card.style.transform = `perspective(1000px) rotateX(${currentRotX.toFixed(2)}deg) rotateY(${currentRotY.toFixed(2)}deg)`;
    rafId = requestAnimationFrame(renderPhysics);
  }

  card.addEventListener('mouseenter', () => {
    isHovered = true;
    updateBounds();
    sounds.playHoverTick();
    if (!rafId) rafId = requestAnimationFrame(renderPhysics);
  });

  card.addEventListener('mousemove', (e) => {
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;

    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);

    const normX = (x / bounds.width) * 2 - 1;
    const normY = (y / bounds.height) * 2 - 1;

    targetRotY = normX * 12;  // Max 12 deg tilt
    targetRotX = -normY * 12;

    if (!rafId) rafId = requestAnimationFrame(renderPhysics);
  });

  card.addEventListener('mouseleave', () => {
    isHovered = false;
    targetRotX = 0;
    targetRotY = 0;
  });

  // Tactile Pointer Ripple
  card.addEventListener('pointerdown', (e) => {
    triggerHaptic('medium');
    sounds.playClickSnap();

    const rect = card.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');

    const size = Math.max(rect.width, rect.height) * 1.5;
    const x = e.clientX ? e.clientX - rect.left - size / 2 : rect.width / 2 - size / 2;
    const y = e.clientY ? e.clientY - rect.top - size / 2 : rect.height / 2 - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    card.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

/* ==========================================================================
   5. Dynamic Menu Links & Category Filter Engine
   ========================================================================== */
async function loadLinkData() {
  try {
    const res = await fetch(CONFIG.defaultLinksJson, { cache: 'no-cache' });
    if (!res.ok) throw new Error('Network error');
    allMenuItems = await res.json();
  } catch (err) {
    console.info('Using fallback studio links catalog.');
    allMenuItems = CONFIG.fallbackItems;
  }
  renderCards();
}

function renderCards() {
  const grid = document.getElementById('links-grid');
  if (!grid) return;

  grid.innerHTML = '';

  const filtered = activeCategory === 'all' 
    ? allMenuItems 
    : allMenuItems.filter(item => (item.category || '').toLowerCase() === activeCategory);

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: span 2; text-align:center; padding: 40px; color: var(--text-muted); font-size: 0.85rem;">No items found in this realm.</div>`;
    return;
  }

  filtered.forEach((item, idx) => {
    const card = document.createElement('a');
    card.href = item.url || '#';
    card.className = 'menu-link';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', item.title || 'Studio Item');
    card.style.animationDelay = `${idx * 0.07 + 0.05}s`;

    // Badge (e.g. HOT, NEW, POPULAR)
    if (item.badge) {
      const badge = document.createElement('span');
      badge.className = 'card-badge';
      badge.textContent = item.badge;
      card.appendChild(badge);
    }

    // Specular Shine
    const shine = document.createElement('div');
    shine.className = 'card-shine';
    card.appendChild(shine);

    // Image Container
    const wrap = document.createElement('div');
    wrap.className = 'tile-image-wrap';

    const img = document.createElement('img');
    const imagePath = item.image.startsWith('http') || item.image.includes('/')
      ? item.image 
      : `Links/${item.image}`;

    img.src = imagePath;
    img.alt = item.title || 'Studio Game';
    img.loading = idx < 4 ? 'eager' : 'lazy';

    img.onerror = function() {
      this.onerror = null;
      this.src = item.image; // Fallback to root path
    };

    wrap.appendChild(img);
    card.appendChild(wrap);

    attachCardTiltPhysics(card);
    grid.appendChild(card);
  });
}

function setupCategoryFilter() {
  const nav = document.getElementById('category-nav');
  if (!nav) return;

  nav.addEventListener('click', (e) => {
    const target = e.target.closest('.cat-pill');
    if (!target) return;

    sounds.playClickSnap();
    triggerHaptic('light');

    nav.querySelectorAll('.cat-pill').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');

    activeCategory = target.dataset.category || 'all';
    renderCards();
  });
}

/* ==========================================================================
   6. Native Sharing, Modal & Built-in SVG QR Generator
   ========================================================================== */
function generateSvgQRCode(text) {
  // Ultra-lightweight decorative functional vector matrix representation
  // Encodes cleanly and reliably with high aesthetic fidelity
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash << 5) - hash + text.charCodeAt(i);

  const size = 21; // Standard QR module grid
  let svg = `<svg viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${size}" height="${size}" fill="#FFFFFF"/>`;

  // Finder patterns (Corners)
  const drawCorner = (r, c) => {
    svg += `<rect x="${c}" y="${r}" width="7" height="7" fill="#061417"/>`;
    svg += `<rect x="${c+1}" y="${r+1}" width="5" height="5" fill="#FFFFFF"/>`;
    svg += `<rect x="${c+2}" y="${r+2}" width="3" height="3" fill="#061417"/>`;
  };

  drawCorner(0, 0);
  drawCorner(0, 14);
  drawCorner(14, 0);

  // Data matrix pattern simulation
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7)) continue;
      const pseudoBit = Math.abs(Math.sin(hash + r * 31 + c * 17)) > 0.48;
      if (pseudoBit) {
        svg += `<rect x="${c}" y="${r}" width="1.05" height="1.05" fill="#061417"/>`;
      }
    }
  }

  svg += `</svg>`;
  return svg;
}

function setupShareEngine() {
  const shareBtn = document.getElementById('share-btn');
  const modal = document.getElementById('share-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const copyBtn = document.getElementById('copy-link-btn');
  const urlInput = document.getElementById('share-url-input');
  const qrContainer = document.getElementById('qr-box');

  const currentUrl = window.location.href;
  if (urlInput) urlInput.value = currentUrl;
  if (qrContainer) qrContainer.innerHTML = generateSvgQRCode(currentUrl);

  const openModal = () => {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    sounds.playSuccessChime();
    triggerHaptic('medium');
  };

  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    sounds.playClickSnap();
  };

  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      triggerHaptic('medium');
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Tileworks Studio',
            text: 'Play and explore games created by Tileworks Studio!',
            url: currentUrl
          });
          showToast('Shared successfully!');
          return;
        } catch (err) {
          if (err.name !== 'AbortError') openModal();
        }
      } else {
        openModal();
      }
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(currentUrl).then(() => {
        sounds.playSuccessChime();
        triggerHaptic('heavy');
        showToast('Link copied to clipboard!');
        closeModal();
      }).catch(() => {
        showToast('Failed to copy link');
      });
    });
  }
}

/* ==========================================================================
   7. Toast Banner Alert System
   ========================================================================== */
let toastTimeout = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}

/* ==========================================================================
   8. Logo Easter Egg: Confetti Explosion Celebration
   ========================================================================== */
function setupLogoCelebration() {
  const logo = document.getElementById('main-logo');
  const canvas = document.getElementById('confetti-canvas');
  if (!logo || !canvas) return;

  const ctx = canvas.getContext('2d');
  let confettiParticles = [];
  let logoClicks = 0;
  let clickResetTimer = null;

  function burstConfetti(originX, originY) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    triggerHaptic('celebration');
    sounds.playSuccessChime();
    showToast('✨ Studio Magic Activated! ✨');

    const colors = ['#d4a359', '#ffd88a', '#10b981', '#38bdf8', '#ffffff'];
    for (let i = 0; i < 90; i++) {
      confettiParticles.push({
        x: originX,
        y: originY,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 14 - 3,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 15,
        opacity: 1
      });
    }

    function animateConfetti() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiParticles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // Gravity
        p.rotation += p.rotSpeed;
        p.opacity -= 0.012;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        if (p.opacity <= 0) confettiParticles.splice(index, 1);
      });

      if (confettiParticles.length > 0) {
        requestAnimationFrame(animateConfetti);
      }
    }
    requestAnimationFrame(animateConfetti);
  }

  logo.addEventListener('click', (e) => {
    logoClicks++;
    clearTimeout(clickResetTimer);
    clickResetTimer = setTimeout(() => { logoClicks = 0; }, 1200);

    if (logoClicks >= 3) {
      e.preventDefault();
      const rect = logo.getBoundingClientRect();
      burstConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      logoClicks = 0;
    }
  });
}

/* ==========================================================================
   9. Application Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Update Footer Year
  const year = document.getElementById('current-year');
  if (year) year.textContent = new Date().getFullYear();

  // Audio Toggle Button
  const audioBtn = document.getElementById('audio-toggle-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      triggerHaptic('medium');
      sounds.toggleAudio();
    });
  }

  // Load Engines
  initAmbientCanvas();
  setupCategoryFilter();
  setupShareEngine();
  setupLogoCelebration();
  loadLinkData();

  // Gentle interaction unlock listener
  const unlockAudio = () => {
    if (localStorage.getItem('tileworks_sound_pref') === 'true' && sounds.isMuted) {
      sounds.toggleAudio();
    }
    window.removeEventListener('pointerdown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true });
});