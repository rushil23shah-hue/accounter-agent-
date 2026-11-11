//agenticpay-side undo window: delay the final action, cancel releases it
import { UndoHoldWindow } from "../contracts/index.js";

type Timers = {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};

const REAL_TIMERS: Timers = { set: (fn, ms) => setTimeout(fn, ms), clear: (h) => clearTimeout(h as NodeJS.Timeout) };

export class UndoWindow {
  private readonly pending = new Map<string, unknown>();

  constructor(private readonly timers: Timers = REAL_TIMERS, private readonly windowMs: number = 60_000) {}

  /**
   * Starts the hold. When it expires uncancelled, finalize() runs
   * (capture for orders, createPayout for payouts).
   */
  public start(key: string, finalize: () => Promise<unknown>): UndoHoldWindow {
    const handle = this.timers.set(() => {
      this.pending.delete(key);
      void finalize();
    }, this.windowMs);
    this.pending.set(key, handle);
    return {
      windowSeconds: 60,
      holdExpiresAt: new Date(Date.now() + this.windowMs).toISOString(),
      isVoidable: true,
    };
  }

  /** Returns true if cancelled in time (release() runs), false if the window already closed. */
  public async cancel(key: string, release: () => Promise<unknown>): Promise<boolean> {
    const handle = this.pending.get(key);
    if (handle === undefined) return false;
    this.timers.clear(handle);
    this.pending.delete(key);
    await release();
    return true;
  }
}
