# Custom Data Structures in Xona POS

Xona POS combines **MongoDB** for database durability with **custom in-memory data structures** for real-time autocomplete queries, co-occurrence recommendation network traversals, and sales-popularity rankings.

---

## 🌳 1. AVL Tree (Self-Balancing Binary Search Tree)
* **File:** [AVLTree.ts](./backend/src/data-structures/AVLTree.ts)
* **Purpose:** Stores and sorts product catalog items (`ProductRecord`) alphabetically by name.
* **Key Features:**
  * **Search & Autocomplete:** $O(\log N)$ search lookups and $O(\log N + K)$ prefix searching (`searchByPrefix`) to provide instant recommendations during checkout bar typing.
  * **Balancing Operations:** Re-balances automatically using Left/Right rotations on insert/delete, guaranteeing $O(\log N)$ time complexity.
  * **ID Lookup:** Fast $O(1)$ lookup via an internal ID-to-product mapping registry index.

---

## 🕸️ 2. Graph (Adjacency List Network)
* **File:** [Graph.ts](./backend/src/data-structures/Graph.ts)
* **Purpose:** Maps relational connection pathways between catalog items.
* **Nodes & Edges:**
  * **Nodes:** Represent products or categories.
  * **Edges:** Model category hierarchies (`BELONGS_TO`) and checkout co-occurrences (`BOUGHT_WITH`).
* **Traversals:**
  * **BFS (`bfs`):** Explores neighbouring nodes in the purchase net up to a configurable search depth to supply real-time recommendations (i.e. finding products commonly bought with cart items).
  * **DFS (`dfs`):** Compiles full relationship paths to identify connected sub-clusters.
  * **Subgraph Extraction:** Extracts local node clusters and connected edges to populate interactive visual network canvases.

---

## 🥞 3. Max Heap (Priority Queue)
* **File:** [MaxHeap.ts](./backend/src/data-structures/MaxHeap.ts)
* **Purpose:** Ranks products based on unit sales counts, making it possible to instantly compile and list the best-selling items.
* **Ranking Metrics:**
  * Products are ordered by `salesCount` (units sold).
* **Key Features:**
  * **Top-K Retrieval:** Clones the heap and pops the top $K$ products in $O(K \log N)$ time to populate best-seller dashboards.
  * **Dynamic Score Updates:** Incorporates an internal $O(1)$ index lookup map to locate heap nodes, updating sales figures and executing heap sift-up/down bubble operations in $O(\log N)$ time on new checkouts or cashier refunds.
