export type ClockTickListener = (simTimeMinutes: number, deltaMinutes: number) => void;

export class WorldClock {
  private currentSimTimeMinutes = 0; // H+00:00
  private isRunning = false;
  private speedMultiplier = 1; // 1x, 5x, 15x, 60x
  private listeners: ClockTickListener[] = [];
  private intervalTimer: NodeJS.Timeout | null = null;
  private tickIntervalMs = 1000; // wall-clock 1 second

  constructor(initialMinutes = 0) {
    this.currentSimTimeMinutes = initialMinutes;
  }

  public getSimTimeMinutes(): number {
    return this.currentSimTimeMinutes;
  }

  public getSpeed(): number {
    return this.speedMultiplier;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public setSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(1, Math.min(120, multiplier));
  }

  public subscribe(listener: ClockTickListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.intervalTimer = setInterval(() => {
      if (!this.isRunning) return;
      // 1 second wall clock advances (speedMultiplier / 60) simulation minutes
      const deltaMinutes = (this.speedMultiplier / 60) * (this.tickIntervalMs / 1000);
      this.currentSimTimeMinutes += deltaMinutes;
      for (const listener of this.listeners) {
        listener(this.currentSimTimeMinutes, deltaMinutes);
      }
    }, this.tickIntervalMs);
  }

  public pause(): void {
    this.isRunning = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  public step(minutes = 5): void {
    this.currentSimTimeMinutes += minutes;
    for (const listener of this.listeners) {
      listener(this.currentSimTimeMinutes, minutes);
    }
  }

  public seek(targetMinutes: number): void {
    const delta = targetMinutes - this.currentSimTimeMinutes;
    this.currentSimTimeMinutes = Math.max(0, targetMinutes);
    for (const listener of this.listeners) {
      listener(this.currentSimTimeMinutes, delta);
    }
  }

  public reset(): void {
    this.pause();
    this.currentSimTimeMinutes = 0;
  }
}
