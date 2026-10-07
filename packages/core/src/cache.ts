// SPDX-License-Identifier: MPL-2.0
export class TranslationCache {
  private entries = new Map<string, { text: string; expires: number }>();
  constructor(
    readonly capacity = 1000,
    private ttlMs = 3600000,
  ) {
    if (capacity < 1) throw new Error('Invalid cache capacity');
  }
  get size() {
    return this.entries.size;
  }
  get(key: string): string | undefined {
    const value = this.entries.get(key);
    if (!value) return;
    this.entries.delete(key);
    if (value.expires < Date.now()) return;
    this.entries.set(key, value);
    return value.text;
  }
  set(key: string, text: string): void {
    this.entries.delete(key);
    this.entries.set(key, { text, expires: Date.now() + this.ttlMs });
    while (this.entries.size > this.capacity)
      this.entries.delete(this.entries.keys().next().value!);
  }
  clear(): void {
    this.entries.clear();
  }
}
