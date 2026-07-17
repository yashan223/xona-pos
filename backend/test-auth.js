const BASE = 'http://localhost:3000/api/auth';

async function testAuth() {
  const username = `dev_${Date.now()}`;
  const password = 'securepassword123';
  const email = 'developer@recall.com';

  console.log('--- Test 1: Register User ---');
  try {
    const registerResponse = await fetch(`${BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    }).then(r => {
      if (!r.ok) throw new Error(`HTTP error ${r.status}`);
      return r.json();
    });
    console.log('Registration Response:', JSON.stringify(registerResponse, null, 2));
  } catch (e) {
    console.error('Registration failed:', e);
    process.exit(1);
  }

  console.log('\n--- Test 2: Login User ---');
  try {
    const loginResponse = await fetch(`${BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then(r => {
      if (!r.ok) throw new Error(`HTTP error ${r.status}`);
      return r.json();
    });
    console.log('Login Response:', JSON.stringify(loginResponse, null, 2));
  } catch (e) {
    console.error('Login failed:', e);
    process.exit(1);
  }

  console.log('\n--- Test 3: List Users ---');
  try {
    const usersResponse = await fetch(`${BASE}/users`).then(r => {
      if (!r.ok) throw new Error(`HTTP error ${r.status}`);
      return r.json();
    });
    console.log(`Found ${usersResponse.length} registered users.`);
  } catch (e) {
    console.error('List users failed:', e);
    process.exit(1);
  }

  console.log('\n✅ All Auth API tests passed successfully!');
}

testAuth();
