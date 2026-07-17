import { ProductRecord } from '../types/index.js';

export interface HeapEntry extends ProductRecord {
  compositeScore: number;
}

export class MaxHeap {
  heap: HeapEntry[] = [];
  private _index: Map<string, number> = new Map(); // id → heap index for O(1) lookup

  // ─── Helpers ─────────────────────────────────────────────

  private _parent(i: number): number { return Math.floor((i - 1) / 2); }
  private _left(i: number): number { return 2 * i + 1; }
  private _right(i: number): number { return 2 * i + 2; }

  private _swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    // Update index map
    this._index.set(this.heap[i].id, i);
    this._index.set(this.heap[j].id, j);
  }

  private _compare(a: HeapEntry, b: HeapEntry): number {
    return a.compositeScore - b.compositeScore;
  }

  // ─── Score Calculation ───────────────────────────────────

  static calculateScore(product: Partial<ProductRecord> & { salesCount?: number }): number {
    // Score is simply the salesCount. In a more complex POS system, we can factor in stock level, discount rates, etc.
    return product.salesCount || 0;
  }

  // ─── Heapify Operations ──────────────────────────────────

  private _siftUp(i: number): void {
    while (i > 0) {
      const parent = this._parent(i);
      if (this._compare(this.heap[i], this.heap[parent]) > 0) {
        this._swap(i, parent);
        i = parent;
      } else {
        break;
      }
    }
  }

  private _siftDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let largest = i;
      const left = this._left(i);
      const right = this._right(i);

      if (left < n && this._compare(this.heap[left], this.heap[largest]) > 0) {
        largest = left;
      }
      if (right < n && this._compare(this.heap[right], this.heap[largest]) > 0) {
        largest = right;
      }

      if (largest !== i) {
        this._swap(i, largest);
        i = largest;
      } else {
        break;
      }
    }
  }

  // ─── Core Operations ────────────────────────────────────

  /** Insert a product into the heap */
  insert(product: ProductRecord): HeapEntry {
    const entry: HeapEntry = {
      ...product,
      compositeScore: MaxHeap.calculateScore(product),
    };

    this.heap.push(entry);
    const idx = this.heap.length - 1;
    this._index.set(entry.id, idx);
    this._siftUp(idx);

    return entry;
  }

  /** View the top-ranked product without removing it */
  peek(): HeapEntry | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  /** Remove and return the top-ranked product */
  extractMax(): HeapEntry | null {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) {
      const item = this.heap.pop()!;
      this._index.delete(item.id);
      return item;
    }

    const max = this.heap[0];
    this._index.delete(max.id);

    const last = this.heap.pop()!;
    this.heap[0] = last;
    this._index.set(last.id, 0);
    this._siftDown(0);

    return max;
  }

  /** Get top K products without modifying the heap */
  getTopK(k: number): HeapEntry[] {
    const tempHeap = new MaxHeap();
    tempHeap.heap = [...this.heap];
    tempHeap._index = new Map(this._index);

    const results: HeapEntry[] = [];
    const count = Math.min(k, tempHeap.heap.length);
    for (let i = 0; i < count; i++) {
      const item = tempHeap.extractMax();
      if (item) results.push(item);
    }
    return results;
  }

  /** Update a product's salesCount and re-score */
  updateScore(productId: string, salesCount: number): HeapEntry | null {
    const idx = this._index.get(productId);
    if (idx === undefined) return null;

    const entry = this.heap[idx];
    const oldScore = entry.compositeScore;
    entry.salesCount = salesCount;
    entry.compositeScore = MaxHeap.calculateScore(entry);

    // Re-heapify based on whether score increased or decreased
    if (entry.compositeScore > oldScore) {
      this._siftUp(idx);
    } else {
      this._siftDown(idx);
    }

    return entry;
  }

  /** Get a product by ID */
  getById(productId: string): HeapEntry | null {
    const idx = this._index.get(productId);
    if (idx === undefined) return null;
    return this.heap[idx];
  }

  /** Remove a product by ID */
  remove(productId: string): boolean {
    const idx = this._index.get(productId);
    if (idx === undefined) return false;

    const lastIdx = this.heap.length - 1;
    if (idx !== lastIdx) {
      this._swap(idx, lastIdx);
      this.heap.pop();
      this._index.delete(productId);

      if (this.heap.length > 0 && idx < this.heap.length) {
        this._siftDown(idx);
        this._siftUp(idx);
      }
    } else {
      this.heap.pop();
      this._index.delete(productId);
    }

    return true;
  }

  /** Build heap from an array of products */
  buildHeap(products: ProductRecord[]): void {
    this.heap = products.map(p => ({
      ...p,
      compositeScore: MaxHeap.calculateScore(p),
    }));

    this._index.clear();
    this.heap.forEach((entry, idx) => {
      this._index.set(entry.id, idx);
    });

    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this._siftDown(i);
    }

    // Re-index after heapify to make sure it's accurate
    this._index.clear();
    this.heap.forEach((entry, idx) => {
      this._index.set(entry.id, idx);
    });
  }

  /** Get all products (unsorted) */
  getAll(): HeapEntry[] {
    return [...this.heap];
  }

  /** Get heap size */
  get length(): number {
    return this.heap.length;
  }

  /** Clear the heap */
  clear(): void {
    this.heap = [];
    this._index.clear();
  }
}

export default MaxHeap;
