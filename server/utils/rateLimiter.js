// Rate limiter utility — ensures we don't exceed API rate limits
export class RateLimiter {
  constructor(maxPerSecond = 5) {
    this.minInterval = 1000 / maxPerSecond;
    this.lastCall = 0;
    this.queue = [];
    this.processing = false;
  }

  async execute(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      if (!this.processing) this._process();
    });
  }

  async _process() {
    this.processing = true;
    while (this.queue.length > 0) {
      const now = Date.now();
      const elapsed = now - this.lastCall;
      if (elapsed < this.minInterval) {
        await new Promise(r => setTimeout(r, this.minInterval - elapsed));
      }
      const { fn, resolve, reject } = this.queue.shift();
      this.lastCall = Date.now();
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    }
    this.processing = false;
  }
}
