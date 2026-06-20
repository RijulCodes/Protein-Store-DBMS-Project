// backend/app.test.js
// Run this test with: node --test app.test.js
// Make sure the backend server is running on http://localhost:5000 before running.

const test = require('node:test');
const assert = require('node:assert');

const BASE_URL = 'http://localhost:5000';

test('1. Backend API Server - Health Check', async (t) => {
  const response = await fetch(`${BASE_URL}/`);
  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.strictEqual(data.message, 'Protein Store API running ✓');
});

test('2. Product API - Flat Products Fetch (Backwards Compatible)', async (t) => {
  const response = await fetch(`${BASE_URL}/api/products`);
  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.strictEqual(Array.isArray(data), true);
  assert.ok(data.length > 0, 'Products list should not be empty');
});

test('3. Product API - Paginated Products Fetch', async (t) => {
  const response = await fetch(`${BASE_URL}/api/products?page=1&limit=4`);
  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.ok(data.products, 'Response should contain products array');
  assert.ok(Array.isArray(data.products), 'products field should be an array');
  assert.strictEqual(data.products.length <= 4, true, 'Returned products should respect limit');
  assert.ok(data.total >= 0, 'Response should contain total count');
  assert.ok(data.pages >= 1, 'Response should contain page count');
});

test('4. Product API - Co-Occurrence SQL Recommendations', async (t) => {
  // Use product_id = 1
  const response = await fetch(`${BASE_URL}/api/products/1/recommendations`);
  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.strictEqual(Array.isArray(data), true, 'Recommendations should return an array');
  assert.ok(data.length <= 4, 'Recommendations should return at most 4 items');
});

test('5. AI API - Natural Language Search Parser', async (t) => {
  // Skip test if Gemini API Key is not set on the server
  const envResponse = await fetch(`${BASE_URL}/api/ai/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'Whey under 3000' })
  });

  if (envResponse.status === 503) {
    console.log('Skipping Gemini parser test (Gemini Key not configured on the server).');
    return;
  }

  if (envResponse.status !== 200) {
    const errBody = await envResponse.json();
    console.error('Gemini Search Parser failed response:', errBody);
  }

  assert.strictEqual(envResponse.status, 200, 'Search parser should succeed when Key is configured');
  const data = await envResponse.json();
  assert.ok(data.max_price <= 3000, 'Parsed max price filter should be less than or equal to 3000');
});
