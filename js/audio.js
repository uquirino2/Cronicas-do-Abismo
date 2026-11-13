// ============================================================================
// CRÔNICAS DO ABISMO 8-BIT — Motor de Áudio Chiptune 4 Canais (Estilo NES APU)
// ============================================================================

window.Game8Bit = window.Game8Bit || {};

(function (G) {
  'use strict';

  // Tabela MIDI -> Frequência (Hz)
  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Converte notação tipo "C4", "F#3", "Bb4" para MIDI
  const NOTE_MAP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function noteToMidi(note) {
    if (!note || note === '-' || note === '.') return null;
    if (typeof note === 'number') return note;
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(note.trim());
    if (!m) return null;
    let semitone = NOTE_MAP[m[1]];
    if (m[2] === '#') semitone += 1;
    else if (m[2] === 'b') semitone -= 1;
    const oct = parseInt(m[3], 10);
    return (oct + 1) * 12 + semitone;
  }

  // Composições Chiptune por Bioma / Estado
  // Canal 1: Pulse 25% (Melodia), Canal 2: Pulse 12.5% (Arpejo/Harmonia), Canal 3: Triangle (Baixo), Canal 4: Noise (Percussão: K=kick, S=snare, H=hat)
  const TRACKS = {
    title: {
      bpm: 132,
      melody: [
        'E5', '-', 'B4', 'C5', 'D5', '-', 'C5', 'B4',
        'A4', '-', 'A4', 'C5', 'E5', '-', 'D5', 'C5',
        'B4', '-', 'B4', 'C5', 'D5', '-', 'E5', '-',
        'C5', '-', 'A4', '-', 'A4', '-', '-', '-',
        'D5', '-', 'F5', 'A5', '-', 'G5', 'F5', 'E5',
        '-', 'C5', 'E5', '-', 'D5', 'C5', 'B4', '-',
        'B4', 'C5', 'D5', '-', 'E5', '-', 'C5', '-',
        'A4', '-', 'A4', '-', '-', '-', '-', '-'
      ],
      harmony: [
        'A3', 'E4', 'A3', 'E4', 'G3', 'D4', 'G3', 'D4',
        'F3', 'C4', 'F3', 'C4', 'E3', 'B3', 'E3', 'B3',
        'G3', 'D4', 'G3', 'D4', 'G3', 'B3', 'E4', 'B3',
        'A3', 'E4', 'A3', 'E4', 'A3', 'E4', 'C4', 'E4',
        'D4', 'A4', 'D4', 'A4', 'G3', 'D4', 'G3', 'D4',
        'C4', 'G4', 'C4', 'G4', 'G3', 'D4', 'G3', 'D4',
        'E3', 'B3', 'G#3', 'E4', 'A3', 'E4', 'C4', 'E4',
        'A3', 'E4', 'A3', 'E4', 'A3', '-', '-', '-'
      ],
      bass: [
        'A2', '-', 'A2', '-', 'G2', '-', 'G2', '-',
        'F2', '-', 'F2', '-', 'E2', '-', 'E2', '-',
        'G2', '-', 'G2', '-', 'E2', '-', 'E2', '-',
        'A2', '-', 'E2', '-', 'A2', '-', 'E2', '-',
        'D3', '-', 'D3', '-', 'G2', '-', 'G2', '-',
        'C3', '-', 'C3', '-', 'G2', '-', 'G2', '-',
        'E2', '-', 'E2', '-', 'A2', '-', 'E2', '-',
        'A2', '-', 'E2', '-', 'A2', '-', '-', '-'
      ],
      drums: [
        'K', 'H', 'S', 'H', 'K', 'H', 'S', 'H',
        'K', 'H', 'S', 'H', 'K', 'K', 'S', 'H'
      ]
    },

    dungeon1: {
      bpm: 112,
      melody: [
        'A4', '-', 'E5', '-', 'F5', 'E5', 'D5', 'C5',
        'B4', '-', 'E4', '-', 'G#4', 'B4', 'E5', '-',
        'A4', '-', 'C5', 'E5', 'G5', '-', 'F5', 'E5',
        'D5', '-', 'B4', '-', 'A4', '-', '-', '-'
      ],
      harmony: [
        'A3', 'C4', 'E4', 'C4', 'D4', 'F4', 'A4', 'F4',
        'E3', 'G#3', 'B3', 'E4', 'E3', 'G#3', 'B3', 'E4',
        'A3', 'C4', 'E4', 'C4', 'C4', 'E4', 'G4', 'E4',
        'D4', 'F4', 'E3', 'G#3', 'A3', 'E4', 'A3', '-'
      ],
      bass: [
        'A2', '-', 'A2', 'E2', 'D2', '-', 'D2', 'A2',
        'E2', '-', 'E2', 'B2', 'E2', '-', 'G#2', 'B2',
        'A2', '-', 'E2', '-', 'C3', '-', 'G2', '-',
        'D2', '-', 'E2', '-', 'A2', '-', 'E2', '-'
      ],
      drums: ['K', '.', 'H', '.', 'S', '.', 'H', 'K']
    },

    dungeon2: {
      bpm: 138,
      melody: [
        'E4', 'E4', 'G4', 'A4', '-', 'Bb4', 'A4', 'G4',
        'E4', '-', 'B4', '-', 'A4', 'G4', 'F#4', 'E4',
        'D4', 'D4', 'F4', 'G4', '-', 'A4', 'G4', 'F4',
        'E4', '-', 'G4', 'B4', 'E5', '-', '-', '-'
      ],
      harmony: [
        'E3', 'B3', 'E3', 'B3', 'G3', 'D4', 'F#3', 'C#4',
        'E3', 'B3', 'E3', 'B3', 'D3', 'A3', 'B2', 'F#3',
        'D3', 'A3', 'D3', 'A3', 'C3', 'G3', 'B2', 'F#3',
        'E3', 'B3', 'G3', 'D4', 'E4', 'B3', 'E3', '-'
      ],
      bass: [
        'E2', 'E2', 'E2', '-', 'G2', 'G2', 'F#2', '-',
        'E2', 'E2', 'B2', '-', 'D2', '-', 'B1', '-',
        'D2', 'D2', 'D2', '-', 'C2', 'C2', 'B1', '-',
        'E2', 'E2', 'G2', 'B2', 'E2', '-', 'E2', '-'
      ],
      drums: ['K', 'H', 'S', 'H', 'K', 'K', 'S', 'H']
    },

    dungeon3: {
      bpm: 124,
      melody: [
        'F#5', '-', 'C#5', 'D5', 'E5', '-', 'B4', '-',
        'D5', 'C#5', 'B4', 'A4', 'G#4', '-', 'B4', '-',
        'A4', 'C#5', 'E5', 'A5', 'G#5', '-', 'F#5', '-',
        'E5', 'D5', 'C#5', 'B4', 'A4', '-', '-', '-'
      ],
      harmony: [
        'F#4', 'A4', 'C#5', 'A4', 'E4', 'G#4', 'B4', 'G#4',
        'D4', 'F#4', 'A4', 'F#4', 'E4', 'G#4', 'B4', 'E4',
        'A3', 'C#4', 'E4', 'A4', 'E4', 'G#4', 'D4', 'F#4',
        'C#4', 'E4', 'B3', 'E4', 'A3', 'E4', 'A3', '-'
      ],
      bass: [
        'F#2', '-', 'C#3', '-', 'E2', '-', 'B2', '-',
        'D2', '-', 'A2', '-', 'E2', '-', 'G#2', '-',
        'A2', '-', 'E2', '-', 'C#2', '-', 'D2', '-',
        'E2', '-', 'E2', '-', 'A2', '-', 'E2', '-'
      ],
      drums: ['K', 'H', 'H', 'S', 'K', 'H', 'S', 'H']
    },

    dungeon4: {
      bpm: 144,
      melody: [
        'C5', '-', 'Eb5', 'D5', 'C5', 'B4', 'C5', '-',
        'G4', '-', 'Ab4', 'G4', 'F4', 'Eb4', 'D4', '-',
        'C5', 'D5', 'Eb5', 'G5', 'F5', 'Eb5', 'D5', 'C5',
        'B4', 'D5', 'G5', '-', 'C5', '-', '-', '-'
      ],
      harmony: [
        'C4', 'Eb4', 'G4', 'Eb4', 'Ab3', 'C4', 'Eb4', 'C4',
        'G3', 'B3', 'D4', 'B3', 'F3', 'Ab3', 'G3', 'B3',
        'C4', 'Eb4', 'G4', 'C5', 'F4', 'Ab4', 'D4', 'F4',
        'G3', 'B3', 'D4', 'G4', 'C4', 'G3', 'C4', '-'
      ],
      bass: [
        'C2', 'C2', 'G2', '-', 'Ab1', 'Ab1', 'Eb2', '-',
        'G1', 'G1', 'D2', '-', 'F1', 'F1', 'G1', '-',
        'C2', 'C2', 'Eb2', 'G2', 'F2', 'F2', 'D2', '-',
        'G2', 'G2', 'B2', 'G2', 'C2', '-', 'C2', '-'
      ],
      drums: ['K', 'K', 'S', 'H', 'K', 'H', 'S', 'S']
    },

    boss: {
      bpm: 168,
      melody: [
        'E5', 'E5', 'F5', 'E5', 'D5', 'E5', 'F5', 'G5',
        'A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'B4', 'D5',
        'E5', 'B4', 'C5', 'E5', 'F5', 'C5', 'D5', 'F5',
        'G5', 'F5', 'E5', 'D5', 'E5', '-', 'B4', '-'
      ],
      harmony: [
        'E4', 'B4', 'E4', 'B4', 'D4', 'A4', 'D4', 'A4',
        'C4', 'G4', 'C4', 'G4', 'B3', 'F#4', 'B3', 'F#4',
        'E4', 'G4', 'B4', 'E4', 'F4', 'A4', 'C5', 'F4',
        'G4', 'B4', 'D5', 'B4', 'E4', 'B3', 'E4', '-'
      ],
      bass: [
        'E2', 'E3', 'E2', 'E3', 'D2', 'D3', 'D2', 'D3',
        'C2', 'C3', 'C2', 'C3', 'B1', 'B2', 'B1', 'B2',
        'E2', 'E3', 'E2', 'E3', 'F2', 'F3', 'F2', 'F3',
        'G2', 'G3', 'B2', 'B3', 'E2', 'E3', 'E2', '-'
      ],
      drums: ['K', 'H', 'S', 'H', 'K', 'K', 'S', 'H']
    },

    sanctuary: {
      bpm: 96,
      melody: [
        'G4', '-', 'B4', 'D5', 'C5', '-', 'A4', '-',
        'B4', '-', 'G4', '-', 'E4', '-', 'D4', '-',
        'G4', '-', 'B4', 'D5', 'E5', '-', 'D5', 'C5',
        'B4', '-', 'A4', '-', 'G4', '-', '-', '-'
      ],
      harmony: [
        'G3', 'D4', 'G3', 'D4', 'C4', 'E4', 'D4', 'F#4',
        'G3', 'D4', 'B3', 'D4', 'C4', 'G4', 'D4', 'A4',
        'G3', 'D4', 'G3', 'D4', 'C4', 'G4', 'D4', 'F#4',
        'G3', 'D4', 'D3', 'A3', 'G3', 'D4', 'G3', '-'
      ],
      bass: [
        'G2', '-', '-', '-', 'C3', '-', 'D3', '-',
        'G2', '-', 'B2', '-', 'C3', '-', 'D3', '-',
        'G2', '-', '-', '-', 'C3', '-', 'D3', '-',
        'G2', '-', 'D2', '-', 'G2', '-', '-', '-'
      ],
      drums: ['.', '.', '.', '.', '.', '.', '.', '.']
    }
  };

  const AudioEngine = {
    ctx: null,
    masterGain: null,
    musicGain: null,
    sfxGain: null,
    pulse25: null,
    pulse12: null,
    noiseBuffer: null,

    musicVolume: 0.45,
    sfxVolume: 0.70,
    muted: false,

    currentTrack: null,
    stepIndex: 0,
    nextNoteTime: 0,
    timerId: null,
    unlocked: false,

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.pulse25 = this._makePulseWave(0.25);
      this.pulse12 = this._makePulseWave(0.125);
      this.noiseBuffer = this._makeNoiseBuffer();

      this._applyVolumes();
    },

    unlock() {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.unlocked = true;
    },

    _makePulseWave(duty) {
      const harmonics = 32;
      const real = new Float32Array(harmonics);
      const imag = new Float32Array(harmonics);
      real[0] = 0;
      imag[0] = 0;
      for (let n = 1; n < harmonics; n++) {
        real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
      }
      return this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    },

    _makeNoiseBuffer() {
      const length = this.ctx.sampleRate * 1.0;
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      // Ruído quantizado estilo NES LFSR
      let hold = 0;
      const step = 4;
      for (let i = 0; i < length; i++) {
        if (i % step === 0) hold = Math.random() * 2 - 1;
        data[i] = hold;
      }
      return buffer;
    },

    _applyVolumes() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 1, t);
      this.musicGain.gain.setValueAtTime(this.musicVolume * 0.35, t);
      this.sfxGain.gain.setValueAtTime(this.sfxVolume * 0.5, t);
    },

    setSettings({ musicVolume, sfxVolume, muted }) {
      if (typeof musicVolume === 'number') this.musicVolume = musicVolume;
      if (typeof sfxVolume === 'number') this.sfxVolume = sfxVolume;
      if (typeof muted === 'boolean') this.muted = muted;
      this._applyVolumes();
    },

    playMusic(trackId) {
      if (this.currentTrack === trackId && this.timerId) return;
      this.currentTrack = trackId;
      this.stepIndex = 0;
      if (!this.ctx) return;

      if (this.timerId) clearInterval(this.timerId);
      this.nextNoteTime = this.ctx.currentTime + 0.05;
      this.timerId = setInterval(() => this._scheduler(), 40);
    },

    stopMusic() {
      this.currentTrack = null;
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    },

    _scheduler() {
      if (!this.ctx || !this.currentTrack || this.ctx.state === 'suspended') return;
      const track = TRACKS[this.currentTrack];
      if (!track) return;

      const stepDur = (60 / track.bpm) / 2; // colcheias (8th notes)
      while (this.nextNoteTime < this.ctx.currentTime + 0.14) {
        this._scheduleStep(track, this.stepIndex, this.nextNoteTime, stepDur);
        this.nextNoteTime += stepDur;
        this.stepIndex++;
      }
    },

    _scheduleStep(track, step, time, dur) {
      const mNote = track.melody[step % track.melody.length];
      const hNote = track.harmony[step % track.harmony.length];
      const bNote = track.bass[step % track.bass.length];
      const dHit = track.drums[step % track.drums.length];

      if (mNote && mNote !== '-' && mNote !== '.') {
        const midi = noteToMidi(mNote);
        if (midi !== null) this._playOsc(this.pulse25, midiToFreq(midi), time, dur * 0.85, 0.22, this.musicGain);
      }
      if (hNote && hNote !== '-' && hNote !== '.') {
        const midi = noteToMidi(hNote);
        if (midi !== null) this._playOsc(this.pulse12, midiToFreq(midi), time, dur * 0.72, 0.12, this.musicGain);
      }
      if (bNote && bNote !== '-' && bNote !== '.') {
        const midi = noteToMidi(bNote);
        if (midi !== null) this._playOsc('triangle', midiToFreq(midi), time, dur * 0.92, 0.28, this.musicGain);
      }
      if (dHit && dHit !== '.') {
        this._playDrum(dHit, time);
      }
    },

    _playOsc(waveOrType, freq, startTime, duration, peakGain, dest) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      if (typeof waveOrType === 'string') {
        osc.type = waveOrType;
      } else {
        osc.setPeriodicWave(waveOrType);
      }
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    },

    _playDrum(type, time) {
      if (!this.noiseBuffer) return;
      if (type === 'K') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(42, time + 0.08);
        gain.gain.setValueAtTime(0.32, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(time);
        osc.stop(time + 0.1);
        return;
      }

      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      if (type === 'S') {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, time);
        gain.gain.setValueAtTime(0.16, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        src.start(time);
        src.stop(time + 0.095);
      } else if (type === 'H') {
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(5200, time);
        gain.gain.setValueAtTime(0.07, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        src.start(time);
        src.stop(time + 0.04);
      }
    },

    playSFX(name) {
      if (!this.ctx || this.ctx.state === 'suspended' || this.muted) return;
      const t = this.ctx.currentTime;

      const tone = (wave, f1, f2, dur, vol = 0.25, delay = 0) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        if (typeof wave === 'string') osc.type = wave;
        else osc.setPeriodicWave(wave);
        osc.frequency.setValueAtTime(f1, t + delay);
        if (f2 !== f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + delay + dur);
        g.gain.setValueAtTime(vol, t + delay);
        g.gain.exponentialRampToValueAtTime(0.0008, t + delay + dur);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t + delay);
        osc.stop(t + delay + dur + 0.01);
      };

      const noise = (dur, filterType, freq, vol = 0.25, delay = 0) => {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const flt = this.ctx.createBiquadFilter();
        flt.type = filterType;
        flt.frequency.setValueAtTime(freq, t + delay);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t + delay);
        g.gain.exponentialRampToValueAtTime(0.0008, t + delay + dur);
        src.connect(flt);
        flt.connect(g);
        g.connect(this.sfxGain);
        src.start(t + delay);
        src.stop(t + delay + dur + 0.01);
      };

      switch (name) {
        case 'slash':
          noise(0.08, 'bandpass', 2200, 0.28);
          tone(this.pulse12, 480, 140, 0.07, 0.16);
          break;
        case 'bow':
          tone('triangle', 620, 220, 0.08, 0.22);
          break;
        case 'magic':
          tone(this.pulse25, 520, 980, 0.11, 0.2);
          tone(this.pulse12, 780, 1320, 0.12, 0.14, 0.03);
          break;
        case 'hit':
          noise(0.06, 'lowpass', 1400, 0.28);
          tone(this.pulse25, 190, 75, 0.08, 0.24);
          break;
        case 'crit':
          tone(this.pulse25, 440, 880, 0.08, 0.25);
          tone(this.pulse12, 660, 1320, 0.1, 0.2, 0.04);
          noise(0.09, 'bandpass', 2600, 0.25);
          break;
        case 'playerHurt':
          tone(this.pulse25, 220, 70, 0.16, 0.34);
          noise(0.14, 'lowpass', 900, 0.25);
          break;
        case 'parry':
          tone(this.pulse25, 1180, 1560, 0.09, 0.28);
          tone(this.pulse12, 1760, 2090, 0.14, 0.22, 0.03);
          break;
        case 'dash':
          noise(0.09, 'highpass', 1900, 0.18);
          tone('triangle', 320, 160, 0.08, 0.16);
          break;
        case 'explosion':
          noise(0.36, 'lowpass', 720, 0.48);
          tone('triangle', 120, 34, 0.32, 0.36);
          break;
        case 'pickup':
          tone(this.pulse25, 523, 523, 0.06, 0.2, 0);
          tone(this.pulse25, 659, 659, 0.06, 0.2, 0.05);
          tone(this.pulse25, 784, 1046, 0.11, 0.22, 0.10);
          break;
        case 'coin':
          tone(this.pulse25, 987, 987, 0.05, 0.18, 0);
          tone(this.pulse25, 1318, 1318, 0.12, 0.2, 0.05);
          break;
        case 'doorOpen':
          tone('triangle', 140, 240, 0.15, 0.25);
          tone(this.pulse12, 330, 440, 0.12, 0.16, 0.08);
          break;
        case 'locked':
          tone(this.pulse25, 150, 110, 0.08, 0.2, 0);
          tone(this.pulse25, 130, 95, 0.09, 0.2, 0.09);
          break;
        case 'levelUp':
          [523, 659, 784, 1046].forEach((f, idx) => {
            tone(this.pulse25, f, f, 0.12, 0.22, idx * 0.08);
          });
          break;
        case 'craft':
          tone(this.pulse12, 880, 880, 0.05, 0.22, 0);
          tone(this.pulse12, 1174, 1174, 0.05, 0.22, 0.09);
          tone(this.pulse25, 1568, 1760, 0.15, 0.24, 0.18);
          break;
        case 'freeze':
          tone(this.pulse12, 1200, 1900, 0.12, 0.18);
          tone(this.pulse12, 1600, 2200, 0.12, 0.14, 0.05);
          break;
        case 'shock':
          noise(0.12, 'highpass', 3400, 0.22);
          tone(this.pulse25, 900, 300, 0.1, 0.22);
          break;
        case 'burn':
          noise(0.18, 'bandpass', 1100, 0.22);
          break;
        case 'bossRoar':
          tone(this.pulse25, 140, 52, 0.45, 0.35);
          noise(0.42, 'lowpass', 600, 0.3);
          break;
        case 'uiMove':
          tone(this.pulse12, 660, 660, 0.035, 0.12);
          break;
        case 'uiConfirm':
          tone(this.pulse25, 587, 880, 0.07, 0.16);
          break;
        case 'gameOver':
          [392, 370, 349, 311, 261].forEach((f, idx) => {
            tone(this.pulse25, f, f * 0.96, 0.22, 0.24, idx * 0.18);
          });
          break;
        case 'victory':
          [523, 659, 784, 659, 784, 1046].forEach((f, idx) => {
            tone(this.pulse25, f, f, idx === 5 ? 0.42 : 0.12, 0.25, idx * 0.11);
          });
          break;
      }
    }
  };

  G.AudioEngine = AudioEngine;
})(window.Game8Bit);
