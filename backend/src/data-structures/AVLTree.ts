import { ProductRecord } from '../types/index.js';

export class AVLNode {
  key: string;           // product name (used for ordering)
  data: ProductRecord | ProductRecord[]; // full product record object or array of objects
  left: AVLNode | null = null;
  right: AVLNode | null = null;
  height: number = 1;

  constructor(key: string, data: ProductRecord) {
    this.key = key;
    this.data = data;
  }
}

export class AVLTree {
  root: AVLNode | null = null;
  size: number = 0;
  private _index: Map<string, ProductRecord> = new Map(); // id → data for O(1) lookup by id

  // ─── Height Helpers ──────────────────────────────────────

  private _height(node: AVLNode | null): number {
    return node ? node.height : 0;
  }

  private _updateHeight(node: AVLNode): void {
    node.height = 1 + Math.max(this._height(node.left), this._height(node.right));
  }

  private _balanceFactor(node: AVLNode | null): number {
    return node ? this._height(node.left) - this._height(node.right) : 0;
  }

  // ─── Rotations ───────────────────────────────────────────

  /** Right rotation (LL case) */
  private _rotateRight(y: AVLNode): AVLNode {
    const x = y.left!;
    const T2 = x.right;

    x.right = y;
    y.left = T2;

    this._updateHeight(y);
    this._updateHeight(x);

    return x;
  }

  /** Left rotation (RR case) */
  private _rotateLeft(x: AVLNode): AVLNode {
    const y = x.right!;
    const T2 = y.left;

    y.left = x;
    x.right = T2;

    this._updateHeight(x);
    this._updateHeight(y);

    return y;
  }

  // ─── Balance ─────────────────────────────────────────────

  private _balance(node: AVLNode): AVLNode {
    this._updateHeight(node);
    const bf = this._balanceFactor(node);

    // Left-heavy
    if (bf > 1) {
      // LR case — left-rotate left child first
      if (this._balanceFactor(node.left) < 0) {
        node.left = this._rotateLeft(node.left!);
      }
      // LL case
      return this._rotateRight(node);
    }

    // Right-heavy
    if (bf < -1) {
      // RL case — right-rotate right child first
      if (this._balanceFactor(node.right) > 0) {
        node.right = this._rotateRight(node.right!);
      }
      // RR case
      return this._rotateLeft(node);
    }

    return node;
  }

  // ─── Insert ──────────────────────────────────────────────

  insert(data: ProductRecord): ProductRecord {
    const key = data.name.toLowerCase();
    this.root = this._insert(this.root, key, data);
    this._index.set(data.id, data);
    this.size++;
    return data;
  }

  private _insert(node: AVLNode | null, key: string, data: ProductRecord): AVLNode {
    if (!node) return new AVLNode(key, data);

    if (key < node.key) {
      node.left = this._insert(node.left, key, data);
    } else if (key > node.key) {
      node.right = this._insert(node.right, key, data);
    } else {
      // Duplicate key — store as array or update
      if (Array.isArray(node.data)) {
        node.data.push(data);
      } else {
        node.data = [node.data, data];
      }
      return node;
    }

    return this._balance(node);
  }

  // ─── Delete ──────────────────────────────────────────────

  delete(id: string): boolean {
    const data = this._index.get(id);
    if (!data) return false;

    const key = data.name.toLowerCase();
    this.root = this._delete(this.root, key, id);
    this._index.delete(id);
    this.size--;
    return true;
  }

  private _delete(node: AVLNode | null, key: string, id: string): AVLNode | null {
    if (!node) return null;

    if (key < node.key) {
      node.left = this._delete(node.left, key, id);
    } else if (key > node.key) {
      node.right = this._delete(node.right, key, id);
    } else {
      // Found the node with matching key
      // Handle multi-record nodes
      if (Array.isArray(node.data)) {
        node.data = node.data.filter(d => d.id !== id);
        if (node.data.length === 1) {
          node.data = node.data[0];
        } else if (node.data.length > 0) {
          return node;
        }
        // If empty, fall through to delete the node
      } else if (node.data.id !== id) {
        return node;
      }

      // Standard BST delete
      if (!node.left && !node.right) return null;
      if (!node.left) return node.right;
      if (!node.right) return node.left;

      // Two children — find in-order successor
      const successor = this._findMin(node.right);
      node.key = successor.key;
      node.data = successor.data;
      node.right = this._deleteMin(node.right);
    }

    return this._balance(node);
  }

  private _findMin(node: AVLNode): AVLNode {
    let current = node;
    while (current.left) {
      current = current.left;
    }
    return current;
  }

  private _deleteMin(node: AVLNode): AVLNode | null {
    if (!node.left) return node.right;
    node.left = this._deleteMin(node.left);
    return this._balance(node);
  }

  // ─── Search ──────────────────────────────────────────────

  /** Search by exact product name */
  search(name: string): ProductRecord[] | null {
    const key = name.toLowerCase();
    return this._search(this.root, key);
  }

  private _search(node: AVLNode | null, key: string): ProductRecord[] | null {
    if (!node) return null;
    if (key < node.key) return this._search(node.left, key);
    if (key > node.key) return this._search(node.right, key);

    // Found — return as array
    return Array.isArray(node.data) ? node.data : [node.data];
  }

  /** Search by ID (O(1) via index) */
  searchById(id: string): ProductRecord | null {
    return this._index.get(id) || null;
  }

  /** Search by prefix — collects all products whose key starts with the given prefix */
  searchByPrefix(prefix: string): ProductRecord[] {
    const results: ProductRecord[] = [];
    const lowerPrefix = prefix.toLowerCase();
    this._searchByPrefix(this.root, lowerPrefix, results);
    return results;
  }

  private _searchByPrefix(node: AVLNode | null, prefix: string, results: ProductRecord[]): void {
    if (!node) return;

    // If the key could start with the prefix, explore left subtree
    if (node.key >= prefix) {
      this._searchByPrefix(node.left, prefix, results);
    }

    // Check current node
    if (node.key.startsWith(prefix)) {
      if (Array.isArray(node.data)) {
        results.push(...node.data);
      } else {
        results.push(node.data);
      }
    }

    // If the key is still within prefix range, explore right subtree
    if (node.key < prefix + '\uffff') {
      this._searchByPrefix(node.right, prefix, results);
    }
  }

  // ─── Traversal ───────────────────────────────────────────

  /** In-order traversal — returns all records sorted by product name */
  getAll(): ProductRecord[] {
    const results: ProductRecord[] = [];
    this._inOrder(this.root, results);
    return results;
  }

  private _inOrder(node: AVLNode | null, results: ProductRecord[]): void {
    if (!node) return;
    this._inOrder(node.left, results);
    if (Array.isArray(node.data)) {
      results.push(...node.data);
    } else {
      results.push(node.data);
    }
    this._inOrder(node.right, results);
  }

  /** Get tree statistics */
  getStats() {
    return {
      size: this.size,
      height: this._height(this.root),
      isBalanced: Math.abs(this._balanceFactor(this.root)) <= 1,
    };
  }

  /** Clear the tree */
  clear(): void {
    this.root = null;
    this.size = 0;
    this._index.clear();
  }
}

export default AVLTree;
