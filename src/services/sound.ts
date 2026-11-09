class RetroSoundService {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playBeep(freq = 440, duration = 0.08, type: OscillatorType = 'square', enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Ignore audio errors
    }
  }

  public playStep(enabled = true) {
    this.playBeep(320, 0.06, 'square', enabled);
  }

  public playDealSuccess(enabled = true) {
    if (!enabled) return;
    this.playBeep(523.25, 0.08, 'square', enabled);
    setTimeout(() => this.playBeep(659.25, 0.08, 'square', enabled), 80);
    setTimeout(() => this.playBeep(783.99, 0.14, 'square', enabled), 160);
  }

  public playDealRejected(enabled = true) {
    if (!enabled) return;
    this.playBeep(240, 0.1, 'sawtooth', enabled);
    setTimeout(() => this.playBeep(180, 0.18, 'sawtooth', enabled), 100);
  }

  public playPoliceSiren(enabled = true) {
    if (!enabled) return;
    this.playBeep(680, 0.12, 'square', enabled);
    setTimeout(() => this.playBeep(480, 0.12, 'square', enabled), 130);
    setTimeout(() => this.playBeep(680, 0.12, 'square', enabled), 260);
  }
}

export const soundFX = new RetroSoundService();
