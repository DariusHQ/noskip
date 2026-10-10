export class LRU {
  constructor(capacity) {
    this.capacity = capacity;
    this.keys = [];
    this.values = new Map();
  }

  get size() {
    return this.keys.length;
  }

  get(key) {
    return this.values.get(key);
  }

  set(key, value) {
    this.keys.push(key);
    this.values.set(key, value);
    if (this.keys.length > this.capacity) {
      const oldest = this.keys.shift();
      this.values.delete(oldest);
    }
  }
}
