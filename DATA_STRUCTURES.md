# Data Structures in Recall App

The Recall App combines **SQLite** for database durability with **custom in-memory data structures** for real-time querying, autocomplete, relationship tracing, and ranking.

---

## 1. AVL Tree (Self-Balancing BST)
* **File:** [AVLTree.ts](./backend/src/data-structures/AVLTree.ts)
* **Purpose:** Stores and sorts error logs (`ErrorRecord`) by message.
* **Key Features:**
  * **Search & Autocomplete:** $O(\log N)$ lookup and $O(\log N + K)$ prefix searching (`searchByPrefix`) for real-time suggestions.
  * **Collated Duplicates:** Groups multiple instances of the same error under a single tree node.
  * **ID Lookup:** $O(1)$ lookup via an internal ID-to-record map index.

---

## 2. Graph (Adjacency-List)
* **File:** [Graph.ts](./backend/src/data-structures/Graph.ts)
* **Purpose:** Maps bidirectional relations between entities (`error`, `solution`, `project`, `technology`).
* **Traversals:**
  * **BFS (`bfs`):** Searches up to a maximum depth (hops) to find related logs/solutions.
  * **DFS (`dfs`):** Traverses the full relationship chain to gather connected components.
  * **Subgraph Extraction:** Extracts surrounding nodes and edges for client-side graph visualization.

---

## 3. Max Heap (Priority Queue)
* **File:** [MaxHeap.ts](./backend/src/data-structures/MaxHeap.ts)
* **Purpose:** Ranks debugging solutions so the highest-quality solutions are suggested first.
* **Scoring Formula:**
  $$\text{Score} = (\text{successRate} \times 0.5) + (\text{normalizedUsage} \times 0.3) + \left(\frac{\text{avgRating}}{5} \times 0.2\right)$$
  * *Note: Usage is normalized logarithmically: $\min\left(\frac{\log_{10}(\text{usageCount} + 1)}{3}, 1\right)$.*
* **Key Features:**
  * **Top-K Retrieval:** Clones the heap and pops the top $K$ solutions in $O(K \log N)$ time.
  * **Dynamic Updates:** $O(1)$ index lookup map handles $O(\log N)$ score updates and sift-up/down operations on rating changes.
