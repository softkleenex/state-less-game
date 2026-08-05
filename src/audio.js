export class AudioEngine {
  #context = null;
  #enabled = true;

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
}
