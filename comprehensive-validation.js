#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:8080';
let validationResults = {
  passed: [],
  failed: [],
  warnings: []
};

function makeRequest(method, path, data = null, token = null) {
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

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body ? (res.headers['content-type']?.includes('application/json') ? JSON.parse(body) : body) : null
        });
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function validateFeature(name, testFunc) {
  console.log(`\n🔍 Testing: ${name}`);
  try {
    const result = await testFunc();
    if (result.success) {
      console.log(`   ✅ PASS: ${result.message}`);
      validationResults.passed.push({ feature: name, details: result.message });
    } else {
      console.log(`   ❌ FAIL: ${result.message}`);
      validationResults.failed.push({ feature: name, details: result.message, data: result.data });
    }
    return result;
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    validationResults.failed.push({ feature: name, details: error.message });
    return { success: false, message: error.message };
  }
}

async function runComprehensiveValidation() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     COMPREHENSIVE WEBSITE VALIDATION & TESTING            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'SecureTest@123'
  };

  let accessToken = null;
  let refreshToken = null;

  // ========== TEST 1: Health Check ==========
  await validateFeature('Health Check Endpoint', async () => {
    const res = await makeRequest('GET', '/health');
    return {
      success: res.status === 200 && res.body?.status === 'ok',
      message: res.status === 200 ? 'Health endpoint returns 200 OK' : `Returns ${res.status}`
    };
  });

  // ========== TEST 2: Register New User ==========
  const registerResult = await validateFeature('User Registration', async () => {
    const res = await makeRequest('POST', '/auth/register', testUser);
    if (res.status === 201 && res.body?.id && res.body?.username === testUser.username) {
      return { success: true, message: `User registered successfully (ID: ${res.body.id})` };
    }
    return { success: false, message: `Expected 201, got ${res.status}`, data: res.body };
  });

  // ========== TEST 3: Password Policy Validation ==========
  await validateFeature('Weak Password Rejection', async () => {
    const res = await makeRequest('POST', '/auth/register', {
      username: 'weakuser',
      email: 'weak@test.com',
      password: 'weak'
    });
    return {
      success: res.status === 400 && res.body?.error === 'weak_password',
      message: res.status === 400 ? 'Weak passwords properly rejected' : 'Weak password not rejected'
    };
  });

  // ========== TEST 4: Duplicate User Prevention ==========
  await validateFeature('Duplicate Username Prevention', async () => {
    const res = await makeRequest('POST', '/auth/register', testUser);
    return {
      success: res.status === 409 && res.body?.error === 'conflict',
      message: res.status === 409 ? 'Duplicate usernames properly blocked' : 'Duplicate check failed'
    };
  });

  // ========== TEST 5: Login with Valid Credentials ==========
  const loginResult = await validateFeature('User Login', async () => {
    const res = await makeRequest('POST', '/auth/login', {
      username: testUser.username,
      password: testUser.password
    });
    if (res.status === 200 && res.body?.access_token && res.body?.refresh_token) {
      accessToken = res.body.access_token;
      refreshToken = res.body.refresh_token;
      return { success: true, message: 'Login successful with tokens issued' };
    }
    return { success: false, message: `Expected tokens, got status ${res.status}`, data: res.body };
  });

  // ========== TEST 6: Login with Invalid Credentials ==========
  await validateFeature('Invalid Login Rejection', async () => {
    const res = await makeRequest('POST', '/auth/login', {
      username: testUser.username,
      password: 'WrongPassword@123'
    });
    return {
      success: res.status === 401,
      message: res.status === 401 ? 'Invalid credentials properly rejected' : 'Authentication bypass vulnerability!'
    };
  });

  // ========== TEST 7: Access Protected Endpoint with Token ==========
  await validateFeature('Protected Endpoint Access', async () => {
    if (!accessToken) {
      return { success: false, message: 'No access token available from login' };
    }
    const res = await makeRequest('GET', '/api/profile', null, accessToken);
    return {
      success: res.status === 200 && res.body?.username === testUser.username,
      message: res.status === 200 ? 'Protected endpoint accessible with valid token' : `Got status ${res.status}`
    };
  });

  // ========== TEST 8: Protected Endpoint without Token ==========
  await validateFeature('Protected Endpoint Authorization', async () => {
    const res = await makeRequest('GET', '/api/profile');
    return {
      success: res.status === 401,
      message: res.status === 401 ? 'Unauthorized access properly blocked' : 'Authorization bypass vulnerability!'
    };
  });

  // ========== TEST 9: Token Verification ==========
  await validateFeature('Token Verification Endpoint', async () => {
    if (!accessToken) {
      return { success: false, message: 'No access token available' };
    }
    const res = await makeRequest('GET', `/api/verify-token?token=${accessToken}`);
    return {
      success: res.status === 200 && res.body?.valid === true,
      message: res.body?.valid ? 'Token verification working correctly' : 'Token verification failed'
    };
  });

  // ========== TEST 10: JWT Structure Validation ==========
  await validateFeature('JWT Structure', async () => {
    if (!accessToken) {
      return { success: false, message: 'No access token available' };
    }
    const parts = accessToken.split('.');
    if (parts.length !== 3) {
      return { success: false, message: 'Invalid JWT format (should have 3 parts)' };
    }
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    const checks = [];
    if (header.alg === 'RS256') checks.push('RS256 algorithm');
    if (header.typ === 'JWT') checks.push('"typ":"JWT" header');
    if (payload.sub === testUser.username) checks.push('correct subject');
    if (payload.iss) checks.push('issuer present');
    if (payload.exp && payload.iat) checks.push('expiration times');
    
    return {
      success: checks.length >= 4,
      message: `JWT contains: ${checks.join(', ')}`
    };
  });

  // ========== TEST 11: Refresh Token ==========
  await validateFeature('Token Refresh', async () => {
    if (!refreshToken) {
      return { success: false, message: 'No refresh token available' };
    }
    const res = await makeRequest('POST', '/auth/refresh', { refresh_token: refreshToken });
    return {
      success: res.status === 200 && res.body?.access_token,
      message: res.status === 200 ? 'Refresh token working correctly' : `Got status ${res.status}`
    };
  });

  // ========== TEST 12: CORS Headers ==========
  await validateFeature('CORS Headers', async () => {
    const res = await makeRequest('GET', '/health');
    const hasCORS = res.headers['access-control-allow-origin'] !== undefined;
    return {
      success: hasCORS,
      message: hasCORS ? 'CORS headers present for cross-origin requests' : 'CORS headers missing'
    };
  });

  // ========== TEST 13: Logout (Token Revocation) ==========
  const logoutResult = await validateFeature('Logout / Token Revocation', async () => {
    if (!refreshToken) {
      return { success: false, message: 'No refresh token available' };
    }
    const res = await makeRequest('POST', '/auth/logout', { refresh_token: refreshToken });
    return {
      success: res.status === 204,
      message: res.status === 204 ? 'Logout successful' : `Got status ${res.status}`
    };
  });

  // ========== TEST 14: Verify Token Revoked ==========
  if (logoutResult.success) {
    await validateFeature('Token Revocation Verification', async () => {
      const res = await makeRequest('POST', '/auth/refresh', { refresh_token: refreshToken });
      return {
        success: res.status === 401,
        message: res.status === 401 ? 'Revoked token properly rejected' : 'Token still valid after logout!'
      };
    });
  }

  // ========== FEATURE ANALYSIS ==========
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                  FEATURE ANALYSIS                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('✅ WORKING FEATURES:');
  validationResults.passed.forEach((item, idx) => {
    console.log(`   ${idx + 1}. ${item.feature}: ${item.details}`);
  });

  if (validationResults.failed.length > 0) {
    console.log('\n❌ FAILED/MISSING FEATURES:');
    validationResults.failed.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.feature}: ${item.details}`);
    });
  }

  // ========== ENHANCEMENT RECOMMENDATIONS ==========
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║             ENHANCEMENT RECOMMENDATIONS                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const recommendations = [
    {
      priority: 'HIGH',
      feature: 'User Profile Update',
      description: 'Add endpoint to update user email/password',
      status: 'MISSING'
    },
    {
      priority: 'HIGH',
      feature: 'Rate Limiting Visibility',
      description: 'Show rate limit status on login failures',
      status: 'NEEDS IMPROVEMENT'
    },
    {
      priority: 'MEDIUM',
      feature: 'Token Expiration Display',
      description: 'Show remaining time on access token in dashboard',
      status: 'MISSING'
    },
    {
      priority: 'MEDIUM',
      feature: 'Password Reset',
      description: 'Add forgot password / reset password flow',
      status: 'MISSING'
    },
    {
      priority: 'MEDIUM',
      feature: 'Email Verification',
      description: 'Verify email addresses after registration',
      status: 'MISSING'
    },
    {
      priority: 'LOW',
      feature: 'User Roles Management',
      description: 'Add admin panel to manage user roles',
      status: 'MISSING'
    },
    {
      priority: 'LOW',
      feature: 'Session Management',
      description: 'Show active sessions and allow revoking all tokens',
      status: 'MISSING'
    },
    {
      priority: 'LOW',
      feature: 'API Documentation',
      description: 'Add Swagger/OpenAPI documentation',
      status: 'MISSING'
    },
    {
      priority: 'LOW',
      feature: 'Request Logging',
      description: 'Add request/response logging for debugging',
      status: 'PARTIAL'
    }
  ];

  recommendations.forEach((rec, idx) => {
    console.log(`${idx + 1}. [${rec.priority}] ${rec.feature}`);
    console.log(`   Description: ${rec.description}`);
    console.log(`   Status: ${rec.status}\n`);
  });

  // ========== SUMMARY ==========
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL SUMMARY                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const totalTests = validationResults.passed.length + validationResults.failed.length;
  const passRate = ((validationResults.passed.length / totalTests) * 100).toFixed(1);

  console.log(`📊 Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${validationResults.passed.length}`);
  console.log(`❌ Failed: ${validationResults.failed.length}`);
  console.log(`📈 Success Rate: ${passRate}%`);

  if (passRate >= 90) {
    console.log('\n🌟 EXCELLENT! Your authentication system is working great!');
  } else if (passRate >= 70) {
    console.log('\n👍 GOOD! Most features working, some improvements needed.');
  } else {
    console.log('\n⚠️  ATTENTION NEEDED! Several critical issues found.');
  }

  console.log('\n');
}

runComprehensiveValidation().catch(console.error);
