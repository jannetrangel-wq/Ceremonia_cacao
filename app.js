/**
 * CELEBRACIÓN DE JOSÉ AUGUSTO — CEREMONIA DE CACAO & PACHANGA
 * Robust Audiovisual Engine, Accurate Geometry & Smooth Crossfade
 */

(function () {
  'use strict';

  // --- Configuration ---
  const CONFIG = {
    targetDateIso: '2026-11-07T16:30:00-06:00', // Nov 7, 2026, 4:30 PM America/Monterrey (UTC-6)
    partyAudioStartTime: 26.0,                  // Start 26s into festive track
    crossfadeDuration: 6000,                    // 6 seconds crossfade to party
    reCrossfadeDuration: 6000                   // 6 seconds crossfade back to ceremony
  };

  // --- Runtime State ---
  const STATE = {
    awakened: false,
    isMuted: false,
    currentTrack: null, // 'ceremony' | 'party'
    inPartySection: false
  };

  // --- DOM References ---
  const DOM = {
    body: document.body,
    audioToggleBtn: document.getElementById('audio-toggle-btn'),
    audioStatusText: document.getElementById('audio-status-text'),
    mysteryTopHeader: document.getElementById('mystery-top-header'),
    mysteryBottomCue: document.getElementById('mystery-bottom-cue'),
    seedTrigger: document.getElementById('seed-trigger'),
    seedCueBtn: document.getElementById('seed-cue-btn'),
    seedImage: document.getElementById('seed-image'),
    germinationVideo: document.getElementById('germination-video'),
    mediaContainer: document.getElementById('media-container'),
    revelationCard: document.getElementById('revelation-card'),
    continueBtn: document.getElementById('continue-btn'),
    ceremonySection: document.getElementById('ceremony-section'),
    pachangaSection: document.getElementById('pachanga-section'),
    audioCeremony: document.getElementById('audio-ceremony'),
    audioParty: document.getElementById('audio-party'),
    partyCanvas: document.getElementById('party-canvas'),
    calendarBtn: document.getElementById('add-to-calendar-btn'),
    countdown: {
      days: document.getElementById('days-val'),
      hours: document.getElementById('hours-val'),
      minutes: document.getElementById('minutes-val'),
      seconds: document.getElementById('seconds-val')
    }
  };

  // --- Robust Audio Engine (Web Audio API + Native HTML5 Audio Sync) ---
  class AudioEngine {
    constructor() {
      this.ceremonyAudio = DOM.audioCeremony;
      this.partyAudio = DOM.audioParty;

      // Base volume targets (0.0 to 1.0)
      this.baseCeremonyVol = 1.0;
      this.basePartyVol = 0.0;
      this.crossfadeRaf = null;

      // Web Audio API components
      this.ctx = null;
      this.masterGain = null;
      this.ceremonyGain = null;
      this.partyGain = null;
      this.webAudioReady = false;

      // Fallback tracks in case primary filename is not resolved
      this.setupFallbacks();
    }

    setupFallbacks() {
      this.ceremonyAudio.addEventListener('error', () => {
        if (!this.ceremonyFallbackTried) {
          this.ceremonyFallbackTried = true;
          console.log('Falling back to Light_Through_the_Lattice.mp3');
          this.ceremonyAudio.src = './assets/audio/Light_Through_the_Lattice.mp3';
          this.ceremonyAudio.load();
        }
      });

      this.partyAudio.addEventListener('error', () => {
        if (!this.partyFallbackTried) {
          this.partyFallbackTried = true;
          console.log('Falling back to Midnight_Terrace.mp3');
          this.partyAudio.src = './assets/audio/Midnight_Terrace.mp3';
          this.partyAudio.load();
        }
      });
    }

    initWebAudio() {
      if (this.webAudioReady) return;
      
      // Do not attempt createMediaElementSource on file:// protocol as Chromium enforces CORS silence
      if (window.location.protocol === 'file:') {
        console.log('Running under file:// protocol. Direct HTML5 audio volume engine active.');
        return;
      }

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        this.ctx = new AudioContextClass();

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = STATE.isMuted ? 0 : 1.0;
        this.masterGain.connect(this.ctx.destination);

        // Ceremony Source & Gain
        const ceremonySrcNode = this.ctx.createMediaElementSource(this.ceremonyAudio);
        this.ceremonyGain = this.ctx.createGain();
        this.ceremonyGain.gain.value = this.baseCeremonyVol;
        ceremonySrcNode.connect(this.ceremonyGain);
        this.ceremonyGain.connect(this.masterGain);

        // Party Source & Gain
        const partySrcNode = this.ctx.createMediaElementSource(this.partyAudio);
        this.partyGain = this.ctx.createGain();
        this.partyGain.gain.value = this.basePartyVol;
        partySrcNode.connect(this.partyGain);
        this.partyGain.connect(this.masterGain);

        this.webAudioReady = true;
        console.log('Web Audio API initialized and connected successfully.');
      } catch (err) {
        console.warn('Web Audio API setup notice (using direct media element volume engine):', err);
        this.webAudioReady = false;
      }
    }

    async unlockAndResume() {
      this.initWebAudio();
      if (this.ctx && this.ctx.state === 'suspended') {
        try {
          await this.ctx.resume();
        } catch (e) {
          console.warn('Could not resume audio context:', e);
        }
      }
    }

    applyVolumes(ceremonyVol, partyVol) {
      this.baseCeremonyVol = ceremonyVol;
      this.basePartyVol = partyVol;

      const effCeremony = STATE.isMuted ? 0 : ceremonyVol;
      const effParty = STATE.isMuted ? 0 : partyVol;

      // Always update native HTMLAudioElement volume (ensures audibility in all environments)
      try {
        this.ceremonyAudio.volume = Math.max(0, Math.min(1, effCeremony));
      } catch (e) {}

      try {
        this.partyAudio.volume = Math.max(0, Math.min(1, effParty));
      } catch (e) {}

      // Also update Web Audio GainNodes if connected
      if (this.webAudioReady && this.ctx && this.ceremonyGain && this.partyGain) {
        const now = this.ctx.currentTime;
        this.ceremonyGain.gain.cancelScheduledValues(now);
        this.ceremonyGain.gain.setValueAtTime(effCeremony, now);
        this.partyGain.gain.cancelScheduledValues(now);
        this.partyGain.gain.setValueAtTime(effParty, now);
      }
    }

    // Called on the user's first tap/click on the seed
    startCeremony() {
      this.unlockAndResume();
      STATE.currentTrack = 'ceremony';

      // Set initial volumes
      this.applyVolumes(1.0, 0.0);

      // Play ceremony track synchronously within user gesture
      const playPromise = this.ceremonyAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Ceremonial music started successfully.');
          this.updateUiState();
        }).catch(err => {
          console.warn('Playback notice:', err);
          this.updateUiState();
        });
      }

      this.updateUiState();
    }

    // Smooth equal-power 6s crossfade to party track starting at 26s
    crossfadeToParty() {
      if (STATE.currentTrack === 'party') return;
      STATE.currentTrack = 'party';

      this.unlockAndResume();

      // Start party audio at ~26 seconds when switching to party mode
      try {
        this.partyAudio.currentTime = CONFIG.partyAudioStartTime;
      } catch (e) {}

      const partyPlay = this.partyAudio.play();
      if (partyPlay !== undefined) {
        partyPlay.catch(e => console.warn('Party play notice:', e));
      }

      if (this.crossfadeRaf) cancelAnimationFrame(this.crossfadeRaf);

      const startTime = performance.now();
      const dur = CONFIG.crossfadeDuration;
      const startCeremonyVol = this.baseCeremonyVol;
      const startPartyVol = this.basePartyVol;

      const fadeStep = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / dur);

        // Smooth cosine transition (0 -> 1)
        const t = (1 - Math.cos(progress * Math.PI)) / 2;
        const cVol = startCeremonyVol + (0.0 - startCeremonyVol) * t;
        const pVol = startPartyVol + (1.0 - startPartyVol) * t;

        this.applyVolumes(cVol, pVol);

        if (progress < 1) {
          this.crossfadeRaf = requestAnimationFrame(fadeStep);
        } else {
          this.crossfadeRaf = null;
        }
      };

      this.crossfadeRaf = requestAnimationFrame(fadeStep);
      this.updateUiState();
    }

    // Smooth equal-power 6s crossfade back to ceremony when user scrolls up
    crossfadeToCeremony() {
      if (STATE.currentTrack === 'ceremony') return;
      STATE.currentTrack = 'ceremony';

      this.unlockAndResume();

      if (this.ceremonyAudio.paused) {
        const playPromise = this.ceremonyAudio.play();
        if (playPromise !== undefined) playPromise.catch(e => {});
      }

      if (this.crossfadeRaf) cancelAnimationFrame(this.crossfadeRaf);

      const startTime = performance.now();
      const dur = CONFIG.reCrossfadeDuration;
      const startCeremonyVol = this.baseCeremonyVol;
      const startPartyVol = this.basePartyVol;

      const fadeStep = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / dur);

        // Smooth cosine transition (0 -> 1)
        const t = (1 - Math.cos(progress * Math.PI)) / 2;
        const cVol = startCeremonyVol + (1.0 - startCeremonyVol) * t;
        const pVol = startPartyVol + (0.0 - startPartyVol) * t;

        this.applyVolumes(cVol, pVol);

        if (progress < 1) {
          this.crossfadeRaf = requestAnimationFrame(fadeStep);
        } else {
          this.crossfadeRaf = null;
          try {
            if (this.partyAudio && !this.partyAudio.paused) {
              this.partyAudio.pause();
            }
          } catch (e) {}
        }
      };

      this.crossfadeRaf = requestAnimationFrame(fadeStep);
      this.updateUiState();
    }

    toggleMute() {
      STATE.isMuted = !STATE.isMuted;

      // Re-apply volumes with current mute state
      this.applyVolumes(this.baseCeremonyVol, this.basePartyVol);

      // If user unmuted using toggle and nothing was playing yet, start ceremony
      if (!STATE.isMuted && STATE.currentTrack === null) {
        this.startCeremony();
      }

      this.updateUiState();
    }

    updateUiState() {
      const isAudible = !STATE.isMuted && STATE.currentTrack !== null;
      if (isAudible) {
        DOM.audioToggleBtn.classList.add('audio-playing');
        DOM.audioToggleBtn.classList.remove('audio-muted');
        DOM.audioStatusText.textContent = 'Música';
        DOM.audioToggleBtn.setAttribute('aria-label', 'Silenciar música');
      } else {
        DOM.audioToggleBtn.classList.remove('audio-playing');
        DOM.audioToggleBtn.classList.add('audio-muted');
        DOM.audioStatusText.textContent = STATE.isMuted ? 'Silenciado' : 'Sonido';
        DOM.audioToggleBtn.setAttribute('aria-label', 'Activar música');
      }
    }
  }

  const audioEngine = new AudioEngine();

  // --- Seed & Awakening Experience ---
  function initSeedExperience() {
    const video = DOM.germinationVideo;
    const img = DOM.seedImage;
    const topHeader = DOM.mysteryTopHeader;
    const bottomCue = DOM.mysteryBottomCue;
    const seedTrigger = DOM.seedTrigger;
    const revelation = DOM.revelationCard;

    video.muted = true;
    video.playsInline = true;
    video.controls = false;
    video.loop = false;
    video.preload = 'auto';

    let videoHandled = false;

    function triggerAwakening(e) {
      if (e) e.preventDefault();
      if (STATE.awakened) return;
      STATE.awakened = true;

      // 1. Start ceremonial music audibly immediately upon tap/click gesture
      audioEngine.startCeremony();

      // 2. Hide prompt overlays
      if (topHeader) topHeader.classList.add('fade-out');
      if (bottomCue) bottomCue.classList.add('fade-out');
      if (seedTrigger) seedTrigger.classList.add('fade-out');

      // 3. Play germination video seamlessly
      video.classList.remove('hidden');

      const onVideoActive = () => {
        if (videoHandled) return;
        videoHandled = true;
        video.classList.add('active');
        img.classList.remove('active');
        img.classList.add('hidden');
      };

      video.addEventListener('playing', onVideoActive, { once: true });
      video.addEventListener('timeupdate', () => {
        if (video.currentTime > 0.05) onVideoActive();
      }, { once: true });

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Video autoplay notice:', err);
          setTimeout(revealIntention, 3500);
        });
      }
    }

    // When germination video completes, reveal the intention quote
    video.addEventListener('ended', () => {
      revealIntention();
    });

    function revealIntention() {
      revelation.classList.remove('hidden');
      requestAnimationFrame(() => {
        revelation.classList.add('revealed');
        DOM.body.classList.remove('is-mystery');
      });
    }

    // Interactive Triggers
    seedTrigger.addEventListener('click', triggerAwakening);
    seedTrigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerAwakening();
      }
    });

    if (DOM.seedCueBtn) {
      DOM.seedCueBtn.addEventListener('click', triggerAwakening);
    }

    // Also clicking directly on the seed image activates awakening
    img.addEventListener('click', () => {
      if (!STATE.awakened) triggerAwakening();
    });

    // Continue button smooth scroll
    DOM.continueBtn.addEventListener('click', (e) => {
      e.preventDefault();
      DOM.ceremonySection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // --- Live Countdown (America/Monterrey: UTC-6) ---
  function initCountdown() {
    const targetTimestamp = Date.parse(CONFIG.targetDateIso);

    function updateTimer() {
      const now = Date.now();
      const diff = targetTimestamp - now;

      if (diff <= 0) {
        DOM.countdown.days.textContent = '00';
        DOM.countdown.hours.textContent = '00';
        DOM.countdown.minutes.textContent = '00';
        DOM.countdown.seconds.textContent = '00';
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      DOM.countdown.days.textContent = String(days).padStart(2, '0');
      DOM.countdown.hours.textContent = String(hours).padStart(2, '0');
      DOM.countdown.minutes.textContent = String(minutes).padStart(2, '0');
      DOM.countdown.seconds.textContent = String(seconds).padStart(2, '0');
    }

    updateTimer();
    setInterval(updateTimer, 1000);
  }

  // --- Scroll Transitions for After-Party Section & Music Crossfade ---
  function initScrollTransitions() {
    let scrollRaf = null;

    function evaluateScrollPosition() {
      if (!STATE.awakened) return;
      if (!DOM.pachangaSection) return;

      const rect = DOM.pachangaSection.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;

      // Hysteresis thresholds relative to viewport height:
      // Entering party: when party top reaches 55% of viewport height
      const enterPartyThreshold = vh * 0.55;
      // Exiting party / returning to ceremony: when party top drops below 70% of viewport height
      const leavePartyThreshold = vh * 0.70;

      if (STATE.currentTrack !== 'party' && rect.top <= enterPartyThreshold) {
        audioEngine.crossfadeToParty();
      } else if (STATE.currentTrack !== 'ceremony' && rect.top > leavePartyThreshold) {
        audioEngine.crossfadeToCeremony();
      }
    }

    // Passive scroll listener throttled with requestAnimationFrame
    window.addEventListener('scroll', () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        evaluateScrollPosition();
        scrollRaf = null;
      });
    }, { passive: true });

    // Also use IntersectionObserver to guarantee evaluation during programmatic/instant scrolls
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(() => {
        evaluateScrollPosition();
      }, {
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0]
      });

      if (DOM.pachangaSection) observer.observe(DOM.pachangaSection);
      if (DOM.ceremonySection) observer.observe(DOM.ceremonySection);
    }

    // Initial check
    evaluateScrollPosition();
  }

  // --- Ambient Canvas Particles for After-Party ---
  function initPartyCanvas() {
    const canvas = DOM.partyCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width, height;
    let particles = [];
    const particleCount = 38;
    let animationFrameId = null;

    function resize() {
      const rect = DOM.pachangaSection.getBoundingClientRect();
      width = canvas.width = rect.width;
      height = canvas.height = rect.height;
    }

    class Particle {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : height + 10;
        this.size = Math.random() * 2.6 + 1.2;
        this.speedY = Math.random() * 0.75 + 0.35;
        this.speedX = (Math.random() - 0.5) * 0.6;
        this.opacity = Math.random() * 0.7 + 0.25;
        this.fadeSpeed = Math.random() * 0.007 + 0.003;
        
        // Warm palette: Gold (44), Amber (34), Copper/Terracotta (22), Soft Coral (12)
        const rand = Math.random();
        if (rand < 0.4) {
          this.hue = 44; // Sacred warm gold
          this.sat = '95%';
        } else if (rand < 0.7) {
          this.hue = 34; // Deep liquid amber
          this.sat = '92%';
        } else if (rand < 0.9) {
          this.hue = 22; // Radiant copper / terracotta
          this.sat = '88%';
        } else {
          this.hue = 12; // Subtle soft coral festive accent
          this.sat = '82%';
        }
      }

      update() {
        this.y -= this.speedY;
        this.x += this.speedX;
        this.opacity -= this.fadeSpeed;
        if (this.y < -10 || this.opacity <= 0) {
          this.reset(false);
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, ${this.sat}, 65%, ${this.opacity})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsla(${this.hue}, 90%, 55%, 0.65)`;
        ctx.fill();
      }
    }

    function initParticles() {
      resize();
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize, { passive: true });
    initParticles();

    const canvasObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!animationFrameId) animate();
        } else {
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
        }
      });
    }, { threshold: 0.05 });

    canvasObserver.observe(DOM.pachangaSection);
  }

  // --- Google Calendar Navigation ---
  function initCalendarExport() {
    // The calendar CTA directly navigates to the prefilled Google Calendar TEMPLATE link in a new tab.
    // No .ics file download is triggered.
  }

  // --- Audio Toggle Pill Button ---
  function initAudioToggle() {
    DOM.audioToggleBtn.addEventListener('click', () => {
      if (!STATE.awakened) {
        STATE.awakened = true;
        audioEngine.startCeremony();
        DOM.seedTrigger.click();
      } else {
        audioEngine.toggleMute();
      }
    });
  }

  // --- Subtle Touch Interaction Effects Across Invitation ---
  function initTouchEffects() {
    const canvas = document.getElementById('touch-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    let width = 0;
    let height = 0;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    const sparks = [];
    const pulses = [];
    let animId = null;

    function spawnTouchEffect(x, y) {
      if (x < 0 || y < 0 || x > width || y > height) return;

      // 1. Soft expanding circular light pulse (aura)
      pulses.push({
        x,
        y,
        radius: 8,
        maxRadius: Math.min(42, Math.max(30, width * 0.08)),
        alpha: 0.65,
        fadeSpeed: 0.035
      });

      // 2. 4 to 6 delicate golden spark flecks
      const count = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.0 + Math.random() * 2.2;
        const color = Math.random() > 0.4 ? '#ffd875' : '#f59e0b';
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.35, // subtle natural upward float
          size: 1.1 + Math.random() * 1.3,
          alpha: 0.9,
          decay: 0.025 + Math.random() * 0.018,
          color
        });
      }

      if (!animId) {
        animId = requestAnimationFrame(animate);
      }
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      // Render light pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.radius += (p.maxRadius - p.radius) * 0.14 + 0.6;
        p.alpha -= p.fadeSpeed;

        if (p.alpha <= 0.01) {
          pulses.splice(i, 1);
          continue;
        }

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, `rgba(255, 235, 175, ${p.alpha * 0.45})`);
        grad.addColorStop(0.45, `rgba(245, 158, 11, ${p.alpha * 0.22})`);
        grad.addColorStop(1, 'rgba(217, 119, 6, 0)');

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Delicate perimeter ring
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.92, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 216, 117, ${p.alpha * 0.35})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Render golden spark flecks
      ctx.shadowBlur = 4;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.94;
        s.vy *= 0.94;
        s.vy -= 0.035; // gentle upward drift
        s.alpha -= s.decay;

        if (s.alpha <= 0.01) {
          sparks.splice(i, 1);
          continue;
        }

        ctx.shadowColor = s.color;
        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0, s.alpha);

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      if (pulses.length > 0 || sparks.length > 0) {
        animId = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, width, height);
        animId = null;
      }
    }

    // Modern pointerdown fires for desktop click, mobile tap, stylus tap instantly
    window.addEventListener('pointerdown', (e) => {
      if (e.isPrimary === false) return;
      spawnTouchEffect(e.clientX, e.clientY);
    }, { passive: true });

    // Expose for testing verification
    window.__TOUCH_EFFECTS_SPAWN__ = spawnTouchEffect;
  }

  // --- Initialization ---
  document.addEventListener('DOMContentLoaded', () => {
    initSeedExperience();
    initCountdown();
    initScrollTransitions();
    initPartyCanvas();
    initTouchEffects();
    initCalendarExport();
    initAudioToggle();
  });

  // --- Expose for verification and testing ---
  window.__AUDIO_STATE__ = STATE;
  window.__AUDIO_ENGINE__ = audioEngine;

})();
