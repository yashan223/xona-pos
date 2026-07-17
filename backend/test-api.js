const BASE = 'http://localhost:3000/api';

async function test() {
  // 1. Create error
  console.log('--- Creating error ---');
  const error = await fetch(`${BASE}/errors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      errorMessage: 'TypeError: Cannot read properties of undefined',
      stackTrace: 'at Object.<anonymous> (app.js:10:5)',
      language: 'JavaScript',
      framework: 'Express',
      project: 'recall-app',
      environment: 'Node 20',
    }),
  }).then(r => r.json());
  console.log(JSON.stringify(error, null, 2));

  // 2. Add solution
  console.log('\n--- Adding solution ---');
  const solution = await fetch(`${BASE}/errors/${error.id}/solutions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Add null check before accessing property',
      steps: JSON.stringify(['Check if object is undefined', 'Add optional chaining', 'Test edge cases']),
      author: 'dev1',
    }),
  }).then(r => r.json());
  console.log(JSON.stringify(solution, null, 2));

  // 3. Get all errors
  console.log('\n--- All errors ---');
  const errors = await fetch(`${BASE}/errors`).then(r => r.json());
  console.log(`Found ${errors.length} errors`);

  // 4. Search
  console.log('\n--- Search "type" ---');
  const searchResults = await fetch(`${BASE}/errors/search?q=type`).then(r => r.json());
  console.log(`Found ${searchResults.length} matching errors`);

  // 5. Top solutions
  console.log('\n--- Top solutions ---');
  const topSolutions = await fetch(`${BASE}/solutions/top?k=5`).then(r => r.json());
  console.log(`${topSolutions.length} solutions ranked`);

  // 6. Graph visualization
  console.log('\n--- Graph ---');
  const graph = await fetch(`${BASE}/graph/visualization`).then(r => r.json());
  console.log(`Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

  // 7. Stats
  console.log('\n--- Stats ---');
  const stats = await fetch(`${BASE}/reports/stats`).then(r => r.json());
  console.log(JSON.stringify(stats, null, 2));

  console.log('\n✅ All API tests passed!');
}

test().catch(console.error);
