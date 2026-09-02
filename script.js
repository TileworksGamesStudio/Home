// script.js

/**
 * Tileworks Studio - Interactive Link Hub Engine
 * Handles dynamic grid rendering, audio synthesis/bgm management,
 * tactile haptic feedback, and dynamic 3D cursor & touch micro-interactions.
 */

// Global Audio State & Configuration
const CONFIG = {
  defaultLinksJson: 'links.json',
  fallbackItems: [
    {
      image: 'chess.svg',
      title: 'Chess',
      url: 'https://tileworksgamesstudio.github.io/Chess/'
    },
    {
      image: 'battleships.svg',
      title: 'Battleships',
      url: 'https://example.com/item-two'
    }
  ],
  audioVolume: 0.35,
  hapticDurations: {
    light: 8,
    medium: 18,
    heavy: [15, 30, 15]
  }
};

let audioContext = null;
let bgAudio = null;
let isAudioPlaying = false;
let userHasInteracted = false;

/* ==========================================================================
   1. Haptic Feedback Engine
   ========================================================================== */
function triggerHaptic(type = 'light') {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      const pattern = CONFIG.hapticDurations[type] || CONFIG.hapticDurations.light;
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore devices where vibrate is restricted or blocked
    }
  }
}

/* ==========================================================================
   2. Web Audio UI Click Synthesizer (Instant Tactile Feedback)
   ========================================================================== */
function playTactileClickSound(freq = 600, type = 'sine') {
  try {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioContext = new AudioCtx();
    }
    
    if (audioContext && audioContext.state === 'running') {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, audioContext.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start();
      osc.stop(audioContext.currentTime + 0.045);
    }
  } catch (e) {
    // Graceful fallback if Web Audio is muted
  }
}

/* ==========================================================================
   3. Background Music (BGM) & Audio Management
   ========================================================================== */
function setupAudioManager() {
  bgAudio = document.getElementById('bg-audio');
  const toggleBtn = document.getElementById('audio-toggle-btn');
  const equalizer = document.getElementById('equalizer');
  const statusLabel = document.getElementById('audio-status');

  if (!bgAudio || !toggleBtn) return;

  bgAudio.volume = CONFIG.audioVolume;

  function updateAudioUI(isPlaying) {
    isAudioPlaying = isPlaying;
    if (isPlaying) {
      equalizer.classList.add('playing');
      statusLabel.textContent = 'Sound: ON';
      statusLabel.style.color = '#fae0a2';
    } else {
      equalizer.classList.remove('playing');
      statusLabel.textContent = 'Sound: OFF';
      statusLabel.style.color = 'var(--text-muted)';
    }
  }

  // Smooth Volume Fade In/Out
  function fadeAudio(targetVolume, duration = 600, callback) {
    if (!bgAudio) return;
    const startVolume = bgAudio.volume;
    const startTime = performance.now();

    function step(now) {
      const elapsed = (now - startTime) / duration;
      if (elapsed < 1) {
        bgAudio.volume = Math.max(0, Math.min(1, startVolume + (targetVolume - startVolume) * elapsed));
        requestAnimationFrame(step);
      } else {
        bgAudio.volume = targetVolume;
        if (callback) callback();
      }
    }
    requestAnimationFrame(step);
  }

  async function startPlayback() {
    try {
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      bgAudio.volume = 0;
      await bgAudio.play();
      fadeAudio(CONFIG.audioVolume, 800);
      updateAudioUI(true);
      localStorage.setItem('tileworks_bgm_pref', 'true');
    } catch (err) {
      console.warn('Audio autoplay prevented or audio file missing:', err.message);
      updateAudioUI(false);
    }
  }

  function pausePlayback() {
    fadeAudio(0, 400, () => {
      bgAudio.pause();
      updateAudioUI(false);
      localStorage.setItem('tileworks_bgm_pref', 'false');
    });
  }

  // Toggle button action
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerHaptic('medium');
    playTactileClickSound(800, 'triangle');

    if (isAudioPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  });

  // Attempt ambient auto-unlock on first user interaction anywhere on the document
  function handleFirstUserGesture() {
    if (userHasInteracted) return;
    userHasInteracted = true;

    // Check saved preference or default to gentle play
    const savedPref = localStorage.getItem('tileworks_bgm_pref');
    if (savedPref !== 'false') {
      startPlayback();
    }

    // Clean up listeners
    window.removeEventListener('click', handleFirstUserGesture);
    window.removeEventListener('touchstart', handleFirstUserGesture);
    window.removeEventListener('keydown', handleFirstUserGesture);
  }

  window.addEventListener('click', handleFirstUserGesture, { once: true, passive: true });
  window.addEventListener('touchstart', handleFirstUserGesture, { once: true, passive: true });
  window.addEventListener('keydown', handleFirstUserGesture, { once: true, passive: true });

  // Handle document visibility change (pause when tab is hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isAudioPlaying) {
      bgAudio.pause();
    } else if (!document.hidden && isAudioPlaying) {
      bgAudio.play().catch(() => {});
    }
  });
}

/* ==========================================================================
   4. Ripple & Dynamic Mouse Lighting Effects
   ========================================================================== */
function applyInteractiveEffects(element) {
  // Cursor coordinate tracker for card glow
  element.addEventListener('mousemove', (e) => {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    element.style.setProperty('--mouse-x', `${x}px`);
    element.style.setProperty('--mouse-y', `${y}px`);
  });

  // Touch & Click Ripple Generator
  element.addEventListener('pointerdown', (e) => {
    triggerHaptic('light');
    playTactileClickSound(520, 'sine');

    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');

    const size = Math.max(rect.width, rect.height);
    const x = e.clientX ? e.clientX - rect.left - size / 2 : rect.width / 2 - size / 2;
    const y = e.clientY ? e.clientY - rect.top - size / 2 : rect.height / 2 - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    element.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  });
}

/* ==========================================================================
   5. Dynamic Menu Links Renderer
   ========================================================================== */
async function renderMenuLinks() {
  const gridContainer = document.getElementById('links-grid');
  if (!gridContainer) return;

  let menuItems = [];

  try {
    const response = await fetch(CONFIG.defaultLinksJson, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    menuItems = await response.json();
  } catch (error) {
    console.warn('Unable to load links.json, falling back to default items:', error);
    menuItems = CONFIG.fallbackItems;
  }

  // Clear Skeleton Loaders
  gridContainer.innerHTML = '';

  menuItems.forEach((item, index) => {
    const linkElement = document.createElement('a');
    linkElement.href = item.url || '#';
    linkElement.className = 'menu-link interactive-element';
    linkElement.setAttribute('role', 'listitem');
    linkElement.setAttribute('aria-label', item.title || item.image.replace(/\.[^/.]+$/, ''));
    linkElement.style.animationDelay = `${index * 0.08 + 0.1}s`;

    // Internal shine overlay
    const shineLayer = document.createElement('div');
    shineLayer.className = 'card-shine';
    linkElement.appendChild(shineLayer);

    // Image Wrap
    const imageWrap = document.createElement('div');
    imageWrap.className = 'tile-image-wrap';

    const imgElement = document.createElement('img');
    const imagePath = item.image.startsWith('http') || item.image.includes('/')
      ? item.image 
      : `Links/${item.image}`;

    imgElement.src = imagePath;
    imgElement.alt = item.title || item.image.replace('.svg', '');
    imgElement.loading = index < 4 ? 'eager' : 'lazy';

    // Fallback if individual link SVG fails to load
    imgElement.onerror = function() {
      this.onerror = null;
      this.src = item.image; // Try root directory
    };

    imageWrap.appendChild(imgElement);
    linkElement.appendChild(imageWrap);

    // Attach haptics & ripple micro-interactions
    applyInteractiveEffects(linkElement);

    gridContainer.appendChild(linkElement);
  });
}

/* ==========================================================================
   6. Logo Interactive Bindings & Utilities
   ========================================================================== */
function initLogoAndUI() {
  const logo = document.getElementById('main-logo');
  if (logo) {
    logo.addEventListener('pointerdown', () => {
      triggerHaptic('heavy');
      playTactileClickSound(440, 'triangle');
    });
  }

  // Update footer year dynamically
  const yearSpan = document.getElementById('current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}

/* ==========================================================================
   7. Application Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  setupAudioManager();
  initLogoAndUI();
  renderMenuLinks();
});
