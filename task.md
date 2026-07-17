# Recall — Implementation Tasks

## Phase 1: Backend Data Structures
- [x] AVLTree.js — Self-balancing BST for error records
- [x] MaxHeap.js — Max heap for solution ranking
- [x] Graph.js — Adjacency list graph with BFS/DFS

## Phase 2: Backend Persistence (SQLite)
- [x] Install better-sqlite3 dependency
- [x] database.js — SQLite connection + schema migrations
- [x] store.js — Persistence layer (load/save between SQLite ↔ data structures)

## Phase 3: Backend API Routes
- [x] errors.js — CRUD for error records
- [x] solutions.js — Solutions + feedback + ranking
- [x] graph.js — Graph traversal + visualization endpoints
- [x] reports.js — Analytics + timeline + patterns
- [x] server.js — Mount all routes + initialize on startup

## Phase 4: Desktop Frontend
- [x] index.css — Dark mode premium theme
- [x] api.ts — API client for all backend endpoints
- [x] Sidebar.tsx — Navigation component
- [x] StatsCard.tsx — Dashboard metric cards
- [x] ErrorCard.tsx — Error display card
- [x] SolutionCard.tsx — Solution display card
- [x] SearchBar.tsx — Search with prefix matching
- [x] TimelineView.tsx — Debugging history timeline
- [x] GraphCanvas.tsx — Canvas-based graph visualization
- [x] DashboardPage.tsx — Overview dashboard
- [x] ErrorsPage.tsx — Error list + search
- [x] AddErrorPage.tsx — New error/solution form
- [x] SolutionsPage.tsx — Ranked solutions list
- [x] GraphPage.tsx — Interactive graph visualization
- [x] ReportsPage.tsx — Analytics dashboard
- [x] App.tsx — Main app with routing + layout

## Phase 5: User Authentication
- [x] database.js — Add users table schema and user_id columns
- [x] crypto.js — Create helper file for hashing and verifying passwords
- [x] auth.js — Create authentication route handler
- [x] server.js — Mount auth routes
- [x] api.ts — Extend client to support login & register endpoints
- [x] LoginPage.tsx — Create login page view
- [x] RegisterPage.tsx — Create registration page view
- [x] App.tsx — Integrate session state and show login/register flow
- [x] Sidebar.tsx — Display user profile info and logout button
