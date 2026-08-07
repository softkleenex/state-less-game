import droneLoopUrl from "./assets/audio/core-drone-loop.mp3";

export class AudioEngine {
  #context = null;
  #enabled = true;
  #droneBuffer = null;
  #droneBufferPromise = null;
  #droneSource = null;
  #droneGain = null;
  #droneFilter = null;

  get enabled() {
    return this.#enabled;
  }

  setEnabled(enabled) {
    this.#enabled = Boolean(enabled);
    if (this.#enabled) this.unlock();
  }

  unlock() {
    if (!this.#enabled) return;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!this.#context) this.#context = new AudioContextClass();
    if (this.#context.state === "suspended") this.#context.resume();
  }

  #tone(frequency, duration, options = {}) {
    if (!this.#enabled) return;
    this.unlock();
    if (!this.#context) return;

    const {
      delay = 0,
      type = "sine",
      volume = 0.035,
      endFrequency = frequency,
    } = options;
    const startAt = this.#context.currentTime + delay;
    const oscillator = this.#context.createOscillator();
    const gain = this.#context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), startAt + duration);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gain);
    gain.connect(this.#context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  navigate(index) {
    this.#tone(330 + index * 38, 0.055, { type: "triangle", volume: 0.018 });
  }

  start() {
    [220, 330, 495].forEach((frequency, index) => {
      this.#tone(frequency, 0.16, { delay: index * 0.07, type: "sine", volume: 0.026 });
    });
  }

  correct(streak) {
    const base = 420 + Math.min(streak, 5) * 35;
    this.#tone(base, 0.12, { type: "triangle", volume: 0.035, endFrequency: base * 1.32 });
    this.#tone(base * 1.5, 0.16, { delay: 0.075, type: "sine", volume: 0.022 });
  }

  wrong() {
    this.#tone(180, 0.24, { type: "sawtooth", volume: 0.028, endFrequency: 78 });
  }

  warning() {
    this.#tone(196, 0.09, { type: "square", volume: 0.016, endFrequency: 165 });
    this.#tone(165, 0.12, { delay: 0.13, type: "square", volume: 0.014, endFrequency: 139 });
  }

  core() {
    [196, 294, 440].forEach((frequency, index) => {
      this.#tone(frequency, 0.2, {
        delay: index * 0.085,
        type: index === 2 ? "triangle" : "sine",
        volume: 0.024,
        endFrequency: frequency * 1.06,
      });
    });
  }

  finish(success) {
    const notes = success ? [262, 392, 523] : [220, 165, 110];
    notes.forEach((frequency, index) => {
      this.#tone(frequency, 0.3, {
        delay: index * 0.12,
        type: success ? "sine" : "triangle",
        volume: 0.028,
      });
    });
  }

  async #loadDroneBuffer() {
    if (this.#droneBuffer) return this.#droneBuffer;
    if (!this.#droneBufferPromise) {
      this.#droneBufferPromise = fetch(droneLoopUrl)
        .then((response) => response.arrayBuffer())
        .then((data) => this.#context.decodeAudioData(data))
        .then((buffer) => {
          this.#droneBuffer = buffer;
          return buffer;
        })
        .catch(() => null);
    }
    return this.#droneBufferPromise;
  }

  // A single CC0 seamless-loop drone (see docs/AI_활용_기술.md for source and
  // license) runs under the whole play screen. Its lowpass cutoff tracks core
  // integrity — the same "hurt" state the core orb shows visually — so a
  // damaged core sounds muffled, not just looks muffled.
  async startDrone() {
    if (!this.#enabled) return;
    this.unlock();
    if (!this.#context) return;
    const buffer = await this.#loadDroneBuffer();
    if (!buffer || !this.#context) return;

    this.stopDrone();
    const source = this.#context.createBufferSource();
    const gain = this.#context.createGain();
    const filter = this.#context.createBiquadFilter();

    source.buffer = buffer;
    source.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 2_200;
    gain.gain.setValueAtTime(0.0001, this.#context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, this.#context.currentTime + 1.4);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.#context.destination);
    source.start();

    this.#droneSource = source;
    this.#droneGain = gain;
    this.#droneFilter = filter;
  }

  setDroneTension(integrityRatio, timeRatio) {
    if (!this.#droneGain || !this.#droneFilter || !this.#context) return;
    const now = this.#context.currentTime;
    const cutoff = 900 + Math.max(0, integrityRatio) * 1_600;
    this.#droneFilter.frequency.cancelScheduledValues(now);
    this.#droneFilter.frequency.linearRampToValueAtTime(cutoff, now + 0.5);

    const climaxGain = 0.05 + Math.max(0, timeRatio) * 0.03;
    this.#droneGain.gain.cancelScheduledValues(now);
    this.#droneGain.gain.linearRampToValueAtTime(climaxGain, now + 0.5);
  }

  stopDrone() {
    if (!this.#droneGain || !this.#context) {
      this.#droneSource = null;
      this.#droneGain = null;
      this.#droneFilter = null;
      return;
    }
    const now = this.#context.currentTime;
    const gain = this.#droneGain;
    const source = this.#droneSource;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    window.setTimeout(() => {
      try {
        source?.stop();
      } catch {
        // already stopped
      }
    }, 400);
    this.#droneSource = null;
    this.#droneGain = null;
    this.#droneFilter = null;
  }
}
