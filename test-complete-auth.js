#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:8080';
let testResults = [];

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body ? JSON.parse(body) : null
        });
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test(name, method, path, data, expectedStatus) {
  try {
    console.log(`\n📝 TEST: ${name}`);
    console.log(`   ${method} ${path}`);
    if (data) console.log(`   Data: ${JSON.stringify(data)}`);
    
    const result = await makeRequest(method, path, data);
    const passed = result.status === expectedStatus;
    
    console.log(`   Status: ${result.status} (Expected: ${expectedStatus}) ${passed ? '✅' : '❌'}`);
    console.log(`   Response: ${JSON.stringify(result.body, null, 2)}`);
    
    testResults.push({ name, passed, status: result.status, expectedStatus });
    return result;
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    testResults.push({ name, passed: false, error: error.message });
    return null;
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   JWT AUTH SERVICE - COMPLETE TEST SUITE   ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // ===== REGISTER TESTS =====
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 REGISTER ENDPOINT TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test 1: Valid registration
  const reg1 = await test(
    'Register with valid credentials',
    'POST',
    '/auth/register',
    { username: 'alice', email: 'alice@example.com', password: 'Alice@123!' },
    201
  );

  // Test 2: Weak password (no special char)
  await test(
    'Register with weak password (no special char)',
    'POST',
    '/auth/register',
    { username: 'bob', email: 'bob@example.com', password: 'Bob12345' },
    400
  );

  // Test 3: Weak password (no number)
  await test(
    'Register with weak password (no number)',
    'POST',
    '/auth/register',
    { username: 'charlie', email: 'charlie@example.com', password: 'Charlie@!' },
    400
  );

  // Test 4: Weak password (too short)
  await test(
    'Register with weak password (too short)',
    'POST',
    '/auth/register',
    { username: 'dave', email: 'dave@example.com', password: 'Dave@1' },
    400
  );

  // Test 5: Missing fields
  await test(
    'Register with missing fields',
    'POST',
    '/auth/register',
    { username: 'eve' },
    400
  );

  // Test 6: Duplicate username
  await test(
    'Register with duplicate username',
    'POST',
    '/auth/register',
    { username: 'alice', email: 'alice2@example.com', password: 'Alice@456!' },
    409
  );

  // Test 7: Duplicate email
  await test(
    'Register with duplicate email',
    'POST',
    '/auth/register',
    { username: 'frank', email: 'alice@example.com', password: 'Frank@123!' },
    409
  );

  // ===== LOGIN TESTS =====
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 LOGIN ENDPOINT TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test 8: Valid login
  const loginRes = await test(
    'Login with valid credentials',
    'POST',
    '/auth/login',
    { username: 'alice', password: 'Alice@123!' },
    200
  );

  let accessToken = null;
  let refreshToken = null;
  if (loginRes && loginRes.body) {
    accessToken = loginRes.body.access_token;
    refreshToken = loginRes.body.refresh_token;
    console.log(`   ✨ Access Token: ${accessToken ? accessToken.substring(0, 20) + '...' : 'null'}`);
    console.log(`   ✨ Refresh Token: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'null'}`);
  }

  // Test 9: Invalid password
  await test(
    'Login with invalid password',
    'POST',
    '/auth/login',
    { username: 'alice', password: 'WrongPassword123!' },
    401
  );

  // Test 10: Non-existent user
  await test(
    'Login with non-existent user',
    'POST',
    '/auth/login',
    { username: 'nonexistent', password: 'Password@123!' },
    401
  );

  // Test 11: Missing credentials
  await test(
    'Login with missing credentials',
    'POST',
    '/auth/login',
    { username: 'alice' },
    400
  );

  // ===== AUTHENTICATION TESTS =====
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🛡️ AUTHENTICATION & PROTECTED ENDPOINT TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test 12: Get profile without token
  await test(
    'Get profile without token',
    'GET',
    '/api/profile',
    null,
    401
  );

  // Test 13: Get profile with valid token
  if (accessToken) {
    const profileReq = http.request(
      new URL('/api/profile', BASE_URL),
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          const passed = res.statusCode === 200;
          console.log(`\n📝 TEST: Get profile with valid token`);
          console.log(`   GET /api/profile`);
          console.log(`   Status: ${res.statusCode} (Expected: 200) ${passed ? '✅' : '❌'}`);
          console.log(`   Response: ${JSON.stringify(JSON.parse(body), null, 2)}`);
          testResults.push({ name: 'Get profile with valid token', passed, status: res.statusCode, expectedStatus: 200 });
        });
      }
    );
    profileReq.end();
  }

  // Test 14: Get profile with invalid token
  const invalidTokenReq = http.request(
    new URL('/api/profile', BASE_URL),
    {
      method: 'GET',
      headers: { 'Authorization': 'Bearer invalid_token_here', 'Content-Type': 'application/json' }
    },
    (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const passed = res.statusCode === 401;
        console.log(`\n📝 TEST: Get profile with invalid token`);
        console.log(`   GET /api/profile`);
        console.log(`   Status: ${res.statusCode} (Expected: 401) ${passed ? '✅' : '❌'}`);
        console.log(`   Response: ${JSON.stringify(JSON.parse(body), null, 2)}`);
        testResults.push({ name: 'Get profile with invalid token', passed, status: res.statusCode, expectedStatus: 401 });
      });
    }
  );
  invalidTokenReq.end();

  // Test 15: Verify valid token
  if (accessToken) {
    const verifyRes = await test(
      'Verify valid token',
      'GET',
      `/api/verify-token?token=${accessToken}`,
      null,
      200
    );
    if (verifyRes && verifyRes.body) {
      console.log(`   Valid: ${verifyRes.body.valid ? '✅' : '❌'}`);
    }
  }

  // Test 16: Verify invalid token
  await test(
    'Verify invalid token',
    'GET',
    '/api/verify-token?token=invalid_token',
    null,
    200
  );

  // ===== REFRESH TOKEN TESTS =====
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 REFRESH TOKEN TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test 17: Refresh with valid token
  if (refreshToken) {
    await test(
      'Refresh with valid refresh token',
      'POST',
      '/auth/refresh',
      { refresh_token: refreshToken },
      200
    );
  }

  // Test 18: Refresh with invalid token
  await test(
    'Refresh with invalid refresh token',
    'POST',
    '/auth/refresh',
    { refresh_token: 'invalid_refresh_token' },
    401
  );

  // ===== LOGOUT TESTS =====
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚪 LOGOUT TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test 19: Logout with valid token
  if (refreshToken) {
    const logoutRes = await test(
      'Logout with valid refresh token',
      'POST',
      '/auth/logout',
      { refresh_token: refreshToken },
      204
    );
    
    // Try to use the token after logout
    if (logoutRes && logoutRes.status === 204) {
      await test(
        'Try to refresh after logout',
        'POST',
        '/auth/refresh',
        { refresh_token: refreshToken },
        401
      );
    }
  }

  // ===== SUMMARY =====
  console.log('\n\n╔════════════════════════════════════════════╗');
  console.log('║           TEST RESULTS SUMMARY             ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const total = testResults.length;
  const passed = testResults.filter(t => t.passed).length;
  const failed = total - passed;

  testResults.forEach((result, idx) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${idx + 1}. ${result.name}`);
  });

  console.log(`\n📊 TOTAL: ${total} tests | ✅ PASSED: ${passed} | ❌ FAILED: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Your authentication system is working correctly!\n');
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Please review the results above.\n`);
  }
}

runTests().catch(console.error);
