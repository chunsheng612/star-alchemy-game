// audio.js - 音效素材、環境聲與合成 fallback

class AudioController {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.masterGain = null;
        this.sfxGain = null;
        this.ambientGain = null;
        this.ambientNodes = [];
        this.currentMode = 'hub';
        this.currentBgm = null;
        this.muted = false;
        this.envTimer = null;
        this.uiLevels = {
            click: 0.18,
            hover: 0.08
        };
        this.hoverReady = true;
        this.canHoverSfx = this.detectHoverSupport();

        this.sfxFiles = {
            click: 'audio/sfx_button_click.mp3',
            hover: 'audio/sfx_button_hover.mp3',
            correct: 'audio/sfx_answer_correct.mp3',
            wrong: 'audio/sfx_answer_wrong.mp3',
            skill: null,
            shield: null,
            playerAttack: null,
            monsterAttack: null,
            crit: null,
            heal: null,
            buff: null,
            debuff: 'audio/sfx_debuff_negative.mp3',
            buy: 'audio/sfx_buy_item.mp3',
            level: null,
            poison: null,
            fire: null,
            ice: 'audio/sfx_ice_effect.mp3',
            lose: null
        };
        this.bgmFiles = {
            hub: 'audio/bg-hub-game.mp3',
            shop: 'audio/bg-shop-Game.mp3',
            puzzle: 'audio/bg-Puzzle-Game.mp3',
            final: null
        };
        this.ambienceFiles = {
            breath: null,
            metal: null,
            chime: null
        };
        this.sceneProfiles = {
            hub: {
                bgmVolume: 0.34,
                cueVolume: 0.26,
                ambience: { master: 0.18, drone: 56, pulse: 112, pulseGain: 0.03, noise: 0.045, filter: 420 }
            },
            shop: {
                bgmVolume: 0.3,
                cueVolume: 0.22,
                ambience: { master: 0.2, drone: 64, pulse: 126, pulseGain: 0.022, noise: 0.035, filter: 620 }
            },
            puzzle: {
                bgmVolume: 0.4,
                cueVolume: 0.28,
                ambience: { master: 0.3, drone: 44, pulse: 132, pulseGain: 0.075, noise: 0.095, filter: 960 }
            },
            final: {
                bgmVolume: 0.46,
                cueVolume: 0.2,
                ambience: { master: 0.34, drone: 38, pulse: 152, pulseGain: 0.11, noise: 0.14, filter: 1280 }
            }
        };
        this.sfx = {};
        this.bgm = {};
        this.ambience = {};
        this.preloadSfx();
        this.preloadBackground();
        this.bindHoverSounds();
    }

    detectHoverSupport() {
        return Boolean(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    }

    preloadSfx() {
        Object.keys(this.sfxFiles).forEach(key => {
            if(this.sfxFiles[key]) this.sfx[key] = this.createAudioElement(this.sfxFiles[key], { volume: 0.65 });
        });
    }

    preloadBackground() {
        Object.keys(this.bgmFiles).forEach(key => {
            if(this.bgmFiles[key]) this.bgm[key] = this.createAudioElement(this.bgmFiles[key], { loop: true, volume: 0 });
        });

        Object.keys(this.ambienceFiles).forEach(key => {
            if(this.ambienceFiles[key]) this.ambience[key] = this.createAudioElement(this.ambienceFiles[key], { volume: 0.35 });
        });
    }

    createAudioElement(path, { loop = false, volume = 1 } = {}) {
        const el = new Audio(path);
        el.preload = 'auto';
        el.loop = loop;
        el.volume = volume;
        el.playsInline = true;
        el.setAttribute('playsinline', '');
        el.setAttribute('webkit-playsinline', '');
        return el;
    }

    init() {
        if (!this.initialized) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.sfxGain = this.ctx.createGain();
            this.ambientGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.82;
            this.sfxGain.gain.value = 0.9;
            this.ambientGain.gain.value = 0.28;
            this.sfxGain.connect(this.masterGain);
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
            this.startBackground(this.currentMode);
        } else if(this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
            this.startBackground(this.currentMode);
        }
    }

    bindHoverSounds() {
        if(window.matchMedia) {
            const media = window.matchMedia('(hover: hover) and (pointer: fine)');
            const syncHoverSupport = (event) => {
                this.canHoverSfx = event.matches;
            };
            this.canHoverSfx = media.matches;
            if(media.addEventListener) media.addEventListener('change', syncHoverSupport);
            else if(media.addListener) media.addListener(syncHoverSupport);
        }

        document.addEventListener('pointerover', (e) => {
            if(!this.initialized || !this.hoverReady || !this.canHoverSfx) return;
            if(e.pointerType && e.pointerType !== 'mouse') return;

            const button = e.target.closest('button');
            if(!button || button.disabled) return;

            const previousButton = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('button') : null;
            if(previousButton === button) return;

            this.hoverReady = false;
            this.playFile('hover', this.uiLevels.hover);
            setTimeout(() => { this.hoverReady = true; }, 180);
        });
    }

    playFile(name, volume = 0.65, fallback = null) {
        if(this.muted) return;
        const src = this.sfx[name];
        if(!src) {
            if(fallback) fallback();
            return;
        }

        const el = src.cloneNode();
        el.volume = volume;
        const result = el.play();
        if(result && result.catch) result.catch(() => fallback && fallback());
    }

    playAudioElement(src, volume = 0.4, fallback = null) {
        if(this.muted || !src) return;
        const el = src.cloneNode();
        el.volume = volume;
        const result = el.play();
        if(result && result.catch) result.catch(() => fallback && fallback());
    }

    startAmbient(mode = 'hub') {
        this.setMusicMode(mode);
    }

    startBackground(mode = 'hub') {
        const scene = this.sceneProfiles[mode] ? mode : 'hub';
        const track = this.bgm[scene] || this.bgm.hub;
        if(!track) return;

        this.currentMode = scene;

        if (!this.initialized) {
            this.currentBgm = track;
            return;
        }

        const previous = this.currentBgm;
        const targetVolume = this.muted ? 0 : this.getBgmVolume(scene);

        if(previous === track) {
            if (track.paused) {
                const result = track.play();
                if(result && result.catch) result.catch(() => {});
            }
            this.fadeAudio(track, targetVolume, 500);
            return;
        }

        this.currentBgm = track;
        track.loop = true;
        track.currentTime = 0;
        track.volume = 0;
        const result = track.play();
        if(result && result.catch) result.catch(() => {});

        this.fadeAudio(track, targetVolume, 1200);
        if(previous) {
            this.fadeAudio(previous, 0, 850, () => {
                previous.pause();
                previous.currentTime = 0;
            });
        }
    }
    getBgmVolume(mode) {
        return this.sceneProfiles[mode]?.bgmVolume || this.sceneProfiles.hub.bgmVolume;
    }

    fadeAudio(el, target, duration = 600, onDone = null) {
        if(!el) return;
        if(el._fadeTimer) clearInterval(el._fadeTimer);
        const start = el.volume;
        const steps = Math.max(1, Math.round(duration / 40));
        let step = 0;
        el._fadeTimer = setInterval(() => {
            step++;
            const t = step / steps;
            el.volume = start + (target - start) * t;
            if(step >= steps) {
                clearInterval(el._fadeTimer);
                el._fadeTimer = null;
                el.volume = target;
                if(onDone) onDone();
            }
        }, duration / steps);
    }

    scheduleEnvironmentCue() {
        if(this.envTimer) clearTimeout(this.envTimer);
        this.envTimer = null;
    }

    playEnvironmentCue() {
        return;
    }

    playEnvironmentFallback() {
        return;
    }

    setMusicMode(mode) {
        this.currentMode = this.sceneProfiles[mode] ? mode : 'hub';
        this.startBackground(this.currentMode);
        if(!this.ctx || !this.ambientNodes.length) return;
        const now = this.ctx.currentTime;
        const drone = this.ambientNodes[0];
        const pulse = this.ambientNodes[1];
        const noise = this.ambientNodes[2];

        const m = this.sceneProfiles[this.currentMode]?.ambience || this.sceneProfiles.hub.ambience;
        this.ambientGain.gain.linearRampToValueAtTime(m.master, now + 0.6);
        drone.node.frequency.linearRampToValueAtTime(m.drone, now + 0.8);
        pulse.node.frequency.linearRampToValueAtTime(m.pulse, now + 0.8);
        pulse.gain.gain.linearRampToValueAtTime(m.pulseGain, now + 0.5);
        noise.gain.gain.linearRampToValueAtTime(m.noise, now + 0.5);
        noise.filter.frequency.linearRampToValueAtTime(m.filter, now + 0.5);
    }

    setScene(scene) {
        this.setMusicMode(scene);
    }

    playFootstep() {
        if (!this.initialized || this.muted) return;
        const bufferSize = this.ctx.sampleRate * 0.045;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const gainNode = this.ctx.createGain();
        noise.buffer = buffer;
        filter.type = 'bandpass';
        filter.frequency.value = 420 + Math.random() * 180;
        gainNode.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.06);
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.sfxGain);
        noise.start();
    }

    playOscillator(type, freq, glideFreq, duration, vol = 1, type2 = null) {
        if (!this.initialized || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (glideFreq) osc.frequency.exponentialRampToValueAtTime(glideFreq, this.ctx.currentTime + duration);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);

        if (type2) {
            const osc2 = this.ctx.createOscillator();
            osc2.type = type2;
            osc2.frequency.setValueAtTime(freq * 1.5, this.ctx.currentTime);
            if (glideFreq) osc2.frequency.exponentialRampToValueAtTime(glideFreq * 1.5, this.ctx.currentTime + duration);
            osc2.connect(gain);
            osc2.start();
            osc2.stop(this.ctx.currentTime + duration);
        }
    }

    playClick() { this.playFile('click', this.uiLevels.click, () => this.playOscillator('triangle', 520, 740, 0.08, 0.035)); }
    playSuccess() { this.playFile('correct', 0.62, () => this.playOscillator('sine', 600, 1200, 0.3, 0.3, 'triangle')); }
    playError() { this.playFile('wrong', 0.62, () => this.playOscillator('sawtooth', 150, 50, 0.4, 0.45)); }
    playWarning() { this.playFile('debuff', 0.55, () => this.playOscillator('square', 400, 400, 0.5, 0.25)); }
    playScan() { this.playFile('skill', 0.5, () => this.playOscillator('sine', 1000, 2000, 0.22, 0.12)); }
    playSkill() { this.playFile('skill', 0.62, () => this.playOscillator('triangle', 220, 880, 0.55, 0.25)); }
    playScaffold() { this.playFile('ice', 0.55, () => this.playOscillator('triangle', 300, 600, 0.4, 0.2)); }
    playShield() { this.playFile('shield', 0.65, () => this.playOscillator('sine', 260, 520, 0.28, 0.2, 'triangle')); }
    playPlayerAttack() { this.playFile('playerAttack', 0.62, () => this.playOscillator('sawtooth', 520, 980, 0.16, 0.24)); }
    playMonsterAttack() { this.playFile('monsterAttack', 0.64, () => this.playOscillator('square', 180, 80, 0.24, 0.26)); }
    playCrit() { this.playFile('crit', 0.7, () => this.playOscillator('triangle', 760, 1520, 0.18, 0.32, 'sine')); }
    playLoot() { this.playFile('buy', 0.58); }
    playHeal() { this.playFile('heal', 0.62, () => this.playOscillator('sine', 420, 840, 0.35, 0.18, 'triangle')); }
    playBuff() { this.playFile('buff', 0.6, () => this.playOscillator('triangle', 360, 960, 0.3, 0.16)); }
    playDebuff() { this.playFile('debuff', 0.58); }
    playLevelUp() { this.playFile('level', 0.7, () => this.playOscillator('sine', 520, 1560, 0.45, 0.28, 'triangle')); }
    playItemUse(itemId) {
        if(['medkit', 'sedative'].includes(itemId)) this.playHeal();
        else if(['battery', 'eldritch_flesh', 'star_stone'].includes(itemId)) this.playBuff();
        else if(['rusty_gear', 'black_water'].includes(itemId)) this.playDebuff();
        else this.playLoot();
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    setMuted(value) {
        this.muted = Boolean(value);
        if(this.masterGain && this.ctx) {
            const target = this.muted ? 0 : 0.82;
            this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.18);
        }
        if(this.currentBgm) {
            this.fadeAudio(this.currentBgm, this.muted ? 0 : this.getBgmVolume(this.currentMode), 250);
        }
        this.updateMuteButton();
    }

    updateMuteButton() {
        const btn = document.getElementById('btn-toggle-audio');
        if(!btn) return;
        btn.textContent = this.muted ? '♪̸' : '♪';
        btn.title = this.muted ? '開啟背景音效' : '關閉背景音效';
        btn.classList.toggle('muted', this.muted);
    }
}

const audio = new AudioController();
window.audio = audio;

// Ensure audio initializes on first click
document.addEventListener('pointerdown', () => {
    if (window.audio && !window.audio.initialized) {
        window.audio.init();
    }
}, { once: true });
