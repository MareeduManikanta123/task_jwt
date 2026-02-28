#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:8080';
let issuesFound = [];
let testsPassed = [];

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

function printStep(stepNumber, title) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`STEP ${stepNumber}: ${title}`);
  console.log('='.repeat(70));
}

function printSubStep(message) {
  console.log(`\n→ ${message}`);
}

function printSuccess(message) {
  console.log(`  ✅ PASS: ${message}`);
}

function printError(message, details = null) {
  console.log(`  ❌ FAIL: ${message}`);
  if (details) {
    console.log(`     Details: ${JSON.stringify(details, null, 2)}`);
  }
}

function printInfo(message) {
  console.log(`  ℹ️  INFO: ${message}`);
}

async function runDetailedValidation() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         DETAILED STEP-BY-STEP FUNCTIONALITY VALIDATION             ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const timestamp = Date.now();
  const testUser = {
    username: `user_${timestamp}`,
    email: `user_${timestamp}@test.com`,
    password: 'TestPass@123'
  };

  let registeredUserId = null;
  let accessToken = null;
  let refreshToken = null;
  let userProfile = null;

  // ═══════════════════════════════════════════════════════════════════
  // STEP 1: REGISTER FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════
  printStep(1, 'REGISTER FUNCTIONALITY');

  // 1.1 Test valid registration
  printSubStep('Testing valid user registration');
  try {
    const res = await makeRequest('POST', '/auth/register', testUser);
    printInfo(`Request: POST /auth/register`);
    printInfo(`Payload: ${JSON.stringify(testUser, null, 2)}`);
    printInfo(`Response Status: ${res.status}`);
    printInfo(`Response Body: ${JSON.stringify(res.body, null, 2)}`);

    if (res.status === 201) {
      if (res.body && res.body.id && res.body.username === testUser.username) {
        registeredUserId = res.body.id;
        printSuccess(`User registered successfully with ID: ${registeredUserId}`);
        printSuccess(`Username matches: ${res.body.username}`);
        testsPassed.push('Register - Valid registration');
      } else {
        printError('Response missing required fields (id, username)');
        issuesFound.push({
          feature: 'Register',
          issue: 'Response missing required fields',
          expected: '{ id, username, message }',
          actual: res.body
        });
      }
    } else {
      printError(`Expected status 201, got ${res.status}`, res.body);
      issuesFound.push({
        feature: 'Register',
        issue: 'Wrong status code for valid registration',
        expected: 201,
        actual: res.status
      });
    }
  } catch (error) {
    printError(`Request failed: ${error.message}`);
    issuesFound.push({
      feature: 'Register',
      issue: 'API request failed',
      error: error.message
    });
  }

  // 1.2 Test password validation - too short
  printSubStep('Testing password validation (too short)');
  try {
    const res = await makeRequest('POST', '/auth/register', {
      username: 'shortpass',
      email: 'short@test.com',
      password: 'Short1!'
    });
    printInfo(`Response Status: ${res.status}`);
    
    if (res.status === 400 && res.body?.error === 'weak_password') {
      printSuccess('Short password properly rejected');
      testsPassed.push('Register - Reject short password');
    } else {
      printError(`Expected 400 with weak_password error, got ${res.status}`, res.body);
      issuesFound.push({
        feature: 'Register',
        issue: 'Password length validation not working',
        expected: 'Status 400 with weak_password error',
        actual: `Status ${res.status}`
      });
    }
  } catch (error) {
    printError(`Request failed: ${error.message}`);
  }

  // 1.3 Test password validation - no number
  printSubStep('Testing password validation (no number)');
  try {
    const res = await makeRequest('POST', '/auth/register', {
      username: 'nonumber',
      email: 'nonumber@test.com',
      password: 'NoNumber@Password'
    });
    printInfo(`Response Status: ${res.status}`);
    
    if (res.status === 400 && res.body?.error === 'weak_password') {
      printSuccess('Password without number properly rejected');
      testsPassed.push('Register - Reject password without number');
    } else {
      printError(`Expected 400 with weak_password error, got ${res.status}`, res.body);
      issuesFound.push({
        feature: 'Register',
        issue: 'Password number requirement validation not working'
      });
    }
  } catch (error) {
    printError(`Request failed: ${error.message}`);
  }

  // 1.4 Test password validation - no special character
  printSubStep('Testing password validation (no special character)');
  try {
    const res = await makeRequest('POST', '/auth/register', {
      username: 'nospecial',
      email: 'nospecial@test.com',
      password: 'NoSpecial123'
    });
    printInfo(`Response Status: ${res.status}`);
    
    if (res.status === 400 && res.body?.error === 'weak_password') {
      printSuccess('Password without special character properly rejected');
      testsPassed.push('Register - Reject password without special char');
    } else {
      printError(`Expected 400 with weak_password error, got ${res.status}`, res.body);
      issuesFound.push({
        feature: 'Register',
        issue: 'Password special character requirement validation not working'
      });
    }
  } catch (error) {
    printError(`Request failed: ${error.message}`);
  }

  // 1.5 Test duplicate username
  printSubStep('Testing duplicate username prevention');
  try {
    const res = await makeRequest('POST', '/auth/register', {
      username: testUser.username,
      email: 'different@test.com',
      password: testUser.password
    });
    printInfo(`Response Status: ${res.status}`);
    
    if (res.status === 409 && res.body?.error === 'conflict') {
      printSuccess('Duplicate username properly rejected');
      testsPassed.push('Register - Prevent duplicate username');
    } else {
      printError(`Expected 409 with conflict error, got ${res.status}`, res.body);
      issuesFound.push({
        feature: 'Register',
        issue: 'Duplicate username check not working'
      });
    }
  } catch (error) {
    printError(`Request failed: ${error.message}`);
  }

  // 1.6 Test duplicate email
  printSubStep('Testing duplicate email prevention');
  try {
    const res = await makeRequest('POST', '/auth/register', {
      username: 'differentuser',
      email: testUser.email,
      password: testUser.password
    });
    printInfo(`Response Status: ${res.status}`);
    
    if (res.status === 409 && res.body?.error === 'conflict') {
      printSuccess('Duplicate email properly rejected');
      testsPassed.push('Register - Prevent duplicate email');
    } else {
      printError(`Expected 409 with conflict error, got ${res.status}`, res.body);
      issuesFound.push({
        feature: 'Register',
        issue: 'Duplicate email check not working'
      });
    }
  } catch (error) {
    printError(`Request failed: ${error.message}`);
  }

  // 1.7 Test missing fields
  printSubStep('Testing missing fields validation');
  try {
    const res = await makeRequest('POST', '/auth/register', {
      username: 'missingfields'
    });
    printInfo(`Response Status: ${res.status}`);
    
    if (res.status === 400) {
      printSuccess('Missing fields properly rejected');
      testsPassed.push('Register - Reject missing fields');
    } else {
      printError(`Expected 400, got ${res.status}`, res.body);
      issuesFound.push({
        feature: 'Register',
        issue: 'Missing fields validation not working'
      });
    }
  } catch (error) {
    printError(`Request failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2: LOGIN FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════
  printStep(2, 'LOGIN FUNCTIONALITY');

  // 2.1 Test valid login
  printSubStep('Testing valid login');
  try {
    const res = await makeRequest('POST', '/auth/login', {
      username: testUser.username,
      password: testUser.password
    });
    printInfo(`Request: POST /auth/login`);
    printInfo(`Payload: { username: "${testUser.username}", password: "***" }`);
    printInfo(`Response Status: ${res.status}`);
    printInfo(`Response Body: ${JSON.stringify(res.body, null, 2)}`);

    if (res.status === 200) {
      if (res.body?.access_token && res.body?.refresh_token) {
        accessToken = res.body.access_token;
        refreshToken = res.body.refresh_token;
        
        printSuccess('Login successful');
        printSuccess(`Access token received (length: ${accessToken.length})`);
        printSuccess(`Refresh token received (length: ${refreshToken.length})`);
        
        // Validate token structure
        const tokenParts = accessToken.split('.');
        if (tokenParts.length === 3) {
          printSuccess('Access token has valid JWT structure (3 parts)');
          
          // Decode header and payload
          const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          
          printInfo(`JWT Header: ${JSON.stringify(header, null, 2)}`);
          printInfo(`JWT Payload: ${JSON.stringify(payload, null, 2)}`);
          
          if (header.alg === 'RS256') {
            printSuccess('JWT uses RS256 algorithm');
          } else {
            printError(`Expected RS256, got ${header.alg}`);
            issuesFound.push({
              feature: 'Login',
              issue: 'Wrong JWT algorithm',
              expected: 'RS256',
              actual: header.alg
            });
          }
          
          if (header.typ === 'JWT') {
            printSuccess('JWT has correct "typ" header');
          } else {
            printError(`Missing or wrong "typ" header: ${header.typ}`);
          }
          
          if (payload.sub === testUser.username) {
            printSuccess(`JWT subject matches username: ${payload.sub}`);
          } else {
            printError(`Subject mismatch: ${payload.sub} vs ${testUser.username}`);
          }
          
          if (payload.exp && payload.iat) {
            const expiresIn = payload.exp - payload.iat;
            printSuccess(`JWT has expiration (${expiresIn} seconds from issue)`);
          } else {
            printError('JWT missing exp or iat claims');
          }
          
          if (res.body.token_type === 'Bearer') {
            printSuccess('Token type is Bearer');
          } else {
            printError(`Expected token_type "Bearer", got "${res.body.token_type}"`);
          }
          
          if (res.body.expires_in === 900) {
            printSuccess('Token expires in 900 seconds (15 minutes)');
          } else {
            printInfo(`Token expires in ${res.body.expires_in} seconds`);
          }
        } else {
          printError('Access token has invalid JWT structure');
          issuesFound.push({
            feature: 'Login',
            issue: 'Invalid JWT structure',
            expected: '3 parts separated by dots',
            actual: `${tokenParts.length} parts`
          });
        }
        
        testsPassed.push('Login - Valid credentials');
      } else {
        printError('Response missing tokens', res.body);
        issuesFound.push({
          feature: 'Login',
          issue: 'Missing access_token or refresh_token in response'
        });
      }
    } else {
      printError(`Expected status 200, got ${res.status}`, res.body);
      issuesFound.push({
        feature: 'Login',
        issue: 'Wrong status code for valid login'
      });
    }
  } catch (error) {
    printError(`Request failed: ${error.message}`);
    issuesFound.push({
      feature: 'Login',
      issue: 'API request failed',
      error: error.message
    });
  }

  // 2.2 Test invalid password
  printSubStep('Testing invalid password rejection');
  try {
    const res = await makeRequest('POST', '/auth/login', {
      username: testUser.username,
      password: 'WrongPassword@123'
    });
    printInfo(`Response Status: ${res.status}`);
    
    if (res.status === 401) {
      printSuccess('Invalid password properly rejected');
      testsPassed.push('Login - Reject invalid password');
    } else {
      printError(`Expected 401, got ${res.status}`, res.body);
      issuesFound.push({
        feature: 'Login',
        issue: 'Invalid password not rejected with 401'
      });
    }
  } catch (error) {
    printError(`Request failed: ${error.message}`);
  }

  // 2.3 Test non-existent user
  printSubStep('Testing non-existent user rejection');
  try {
    const res = await makeRequest('POST', '/auth/login', {
      username: 'nonexistentuser999',
      password: 'SomePassword@123'
    });
    printInfo(`Response Status: ${res.status}`);
    
    if (res.status === 401) {
      printSuccess('Non-existent user properly rejected');
      testsPassed.push('Login - Reject non-existent user');
    } else {
      printError(`Expected 401, got ${res.status}`, res.body);
      issuesFound.push({
        feature: 'Login',
        issue: 'Non-existent user not rejected with 401'
      });
    }
  } catch (error) {
    printError(`Request failed: ${error.message}`);
  }

  // 2.4 Test missing credentials
  printSubStep('Testing missing credentials validation');
  try {
    const res = await makeRequest('POST', '/auth/login', {
      username: testUser.username
    });
    printInfo(`Response Status: ${res.status}`);
    
    if (res.status === 400) {
      printSuccess('Missing password properly rejected');
      testsPassed.push('Login - Reject missing credentials');
    } else {
      printError(`Expected 400, got ${res.status}`, res.body);
      issuesFound.push({
        feature: 'Login',
        issue: 'Missing credentials validation not working'
      });
    }
  } catch (error) {
    printError(`Request failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 3: GET PROFILE FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════
  printStep(3, 'GET PROFILE FUNCTIONALITY');

  // 3.1 Test getting profile with valid token
  printSubStep('Testing profile retrieval with valid access token');
  if (!accessToken) {
    printError('Cannot test - no access token from login');
    issuesFound.push({
      feature: 'Get Profile',
      issue: 'Cannot test - login did not provide access token'
    });
  } else {
    try {
      const res = await makeRequest('GET', '/api/profile', null, accessToken);
      printInfo(`Request: GET /api/profile`);
      printInfo(`Authorization: Bearer ${accessToken.substring(0, 20)}...`);
      printInfo(`Response Status: ${res.status}`);
      printInfo(`Response Body: ${JSON.stringify(res.body, null, 2)}`);

      if (res.status === 200) {
        if (res.body?.id && res.body?.username && res.body?.email) {
          userProfile = res.body;
          printSuccess('Profile retrieved successfully');
          printSuccess(`User ID: ${res.body.id}`);
          printSuccess(`Username: ${res.body.username}`);
          printSuccess(`Email: ${res.body.email}`);
          
          if (res.body.username === testUser.username) {
            printSuccess('Username matches registered user');
          } else {
            printError(`Username mismatch: ${res.body.username} vs ${testUser.username}`);
          }
          
          if (res.body.email === testUser.email) {
            printSuccess('Email matches registered user');
          } else {
            printError(`Email mismatch: ${res.body.email} vs ${testUser.email}`);
          }
          
          if (res.body.roles && Array.isArray(res.body.roles)) {
            printSuccess(`User has roles: ${res.body.roles.join(', ')}`);
          } else {
            printInfo('No roles field in profile');
          }
          
          testsPassed.push('Get Profile - Valid token');
        } else {
          printError('Profile response missing required fields', res.body);
          issuesFound.push({
            feature: 'Get Profile',
            issue: 'Response missing id, username, or email'
          });
        }
      } else {
        printError(`Expected status 200, got ${res.status}`, res.body);
        issuesFound.push({
          feature: 'Get Profile',
          issue: 'Wrong status code with valid token'
        });
      }
    } catch (error) {
      printError(`Request failed: ${error.message}`);
      issuesFound.push({
        feature: 'Get Profile',
        issue: 'API request failed',
        error: error.message
      });
    }
  }

  // 3.2 Test getting profile without token
  printSubStep('Testing profile retrieval without access token');
  try {
    const res = await makeRequest('GET', '/api/profile');
    printInfo(`Response Status: ${res.status}`);
    
    if (res.status === 401) {
      printSuccess('Unauthorized access properly blocked');
      testsPassed.push('Get Profile - Reject no token');
    } else {
      printError(`Expected 401, got ${res.status}`, res.body);
      issuesFound.push({
        feature: 'Get Profile',
        issue: 'Endpoint accessible without token (security issue!)',
        severity: 'HIGH'
      });
    }
  } catch (error) {
    printError(`Request failed: ${error.message}`);
  }

  // 3.3 Test getting profile with invalid token
  printSubStep('Testing profile retrieval with invalid access token');
  try {
    const res = await makeRequest('GET', '/api/profile', null, 'invalid_token_here');
    printInfo(`Response Status: ${res.status}`);
    
    if (res.status === 401) {
      printSuccess('Invalid token properly rejected');
      testsPassed.push('Get Profile - Reject invalid token');
    } else {
      printError(`Expected 401, got ${res.status}`, res.body);
      issuesFound.push({
        feature: 'Get Profile',
        issue: 'Invalid token not rejected (security issue!)',
        severity: 'HIGH'
      });
    }
  } catch (error) {
    printError(`Request failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 4: TOKEN MANAGEMENT FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════
  printStep(4, 'TOKEN MANAGEMENT FUNCTIONALITY');

  // 4.1 Test token verification
  printSubStep('Testing token verification endpoint');
  if (!accessToken) {
    printError('Cannot test - no access token');
  } else {
    try {
      const res = await makeRequest('GET', `/api/verify-token?token=${accessToken}`);
      printInfo(`Request: GET /api/verify-token?token=...`);
      printInfo(`Response Status: ${res.status}`);
      printInfo(`Response Body: ${JSON.stringify(res.body, null, 2)}`);

      if (res.status === 200) {
        if (res.body?.valid === true) {
          printSuccess('Token verified as valid');
          
          if (res.body.claims) {
            printSuccess('Token claims returned');
            printInfo(`Claims: ${JSON.stringify(res.body.claims, null, 2)}`);
            
            if (res.body.claims.sub === testUser.username) {
              printSuccess('Claims subject matches username');
            }
          }
          
          testsPassed.push('Token Management - Verify valid token');
        } else {
          printError('Valid token marked as invalid', res.body);
          issuesFound.push({
            feature: 'Token Management',
            issue: 'Valid token verification failed'
          });
        }
      } else {
        printError(`Expected status 200, got ${res.status}`, res.body);
      }
    } catch (error) {
      printError(`Request failed: ${error.message}`);
    }
  }

  // 4.2 Test token verification with invalid token
  printSubStep('Testing token verification with invalid token');
  try {
    const res = await makeRequest('GET', '/api/verify-token?token=invalid_token');
    printInfo(`Response Status: ${res.status}`);
    
    if (res.status === 200 && res.body?.valid === false) {
      printSuccess('Invalid token correctly identified');
      testsPassed.push('Token Management - Identify invalid token');
    } else {
      printError('Invalid token not properly identified', res.body);
    }
  } catch (error) {
    printError(`Request failed: ${error.message}`);
  }

  // 4.3 Test refresh token
  printSubStep('Testing refresh token functionality');
  if (!refreshToken) {
    printError('Cannot test - no refresh token');
  } else {
    try {
      const res = await makeRequest('POST', '/auth/refresh', {
        refresh_token: refreshToken
      });
      printInfo(`Request: POST /auth/refresh`);
      printInfo(`Response Status: ${res.status}`);
      printInfo(`Response Body: ${JSON.stringify(res.body, null, 2)}`);

      if (res.status === 200) {
        if (res.body?.access_token) {
          const newAccessToken = res.body.access_token;
          printSuccess('New access token generated');
          printSuccess(`New token length: ${newAccessToken.length}`);
          
          // Verify new token is different
          if (newAccessToken !== accessToken) {
            printSuccess('New token is different from old token');
          } else {
            printInfo('New token same as old token (might be intentional)');
          }
          
          testsPassed.push('Token Management - Refresh token');
        } else {
          printError('No access token in refresh response', res.body);
          issuesFound.push({
            feature: 'Token Management',
            issue: 'Refresh endpoint not returning access_token'
          });
        }
      } else {
        printError(`Expected status 200, got ${res.status}`, res.body);
        issuesFound.push({
          feature: 'Token Management',
          issue: 'Refresh token endpoint not working'
        });
      }
    } catch (error) {
      printError(`Request failed: ${error.message}`);
    }
  }

  // 4.4 Test refresh with invalid token
  printSubStep('Testing refresh with invalid token');
  try {
    const res = await makeRequest('POST', '/auth/refresh', {
      refresh_token: 'invalid_refresh_token'
    });
    printInfo(`Response Status: ${res.status}`);
    
    if (res.status === 401) {
      printSuccess('Invalid refresh token properly rejected');
      testsPassed.push('Token Management - Reject invalid refresh token');
    } else {
      printError(`Expected 401, got ${res.status}`, res.body);
      issuesFound.push({
        feature: 'Token Management',
        issue: 'Invalid refresh token not rejected'
      });
    }
  } catch (error) {
    printError(`Request failed: ${error.message}`);
  }

  // 4.5 Test logout
  printSubStep('Testing logout functionality');
  if (!refreshToken) {
    printError('Cannot test - no refresh token');
  } else {
    try {
      const res = await makeRequest('POST', '/auth/logout', {
        refresh_token: refreshToken
      });
      printInfo(`Request: POST /auth/logout`);
      printInfo(`Response Status: ${res.status}`);

      if (res.status === 204) {
        printSuccess('Logout successful (204 No Content)');
        testsPassed.push('Token Management - Logout');
        
        // 4.6 Test that refresh token is revoked
        printSubStep('Verifying refresh token is revoked after logout');
        const verifyRes = await makeRequest('POST', '/auth/refresh', {
          refresh_token: refreshToken
        });
        printInfo(`Attempting to use revoked token - Status: ${verifyRes.status}`);
        
        if (verifyRes.status === 401) {
          printSuccess('Revoked refresh token properly rejected');
          testsPassed.push('Token Management - Revoke token on logout');
        } else {
          printError('Revoked token still works (security issue!)', verifyRes.body);
          issuesFound.push({
            feature: 'Token Management',
            issue: 'Logout does not revoke refresh token',
            severity: 'HIGH'
          });
        }
      } else {
        printError(`Expected status 204, got ${res.status}`, res.body);
        issuesFound.push({
          feature: 'Token Management',
          issue: 'Logout endpoint not working correctly'
        });
      }
    } catch (error) {
      printError(`Request failed: ${error.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                         FINAL VALIDATION REPORT                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  console.log('✅ TESTS PASSED:');
  testsPassed.forEach((test, idx) => {
    console.log(`   ${idx + 1}. ${test}`);
  });

  console.log(`\n📊 TOTAL: ${testsPassed.length} tests passed\n`);

  if (issuesFound.length > 0) {
    console.log('❌ ISSUES FOUND:');
    issuesFound.forEach((issue, idx) => {
      console.log(`\n   ${idx + 1}. [${issue.feature}] ${issue.issue}`);
      if (issue.severity) {
        console.log(`      Severity: ⚠️  ${issue.severity}`);
      }
      if (issue.expected) {
        console.log(`      Expected: ${issue.expected}`);
      }
      if (issue.actual) {
        console.log(`      Actual: ${JSON.stringify(issue.actual)}`);
      }
      if (issue.error) {
        console.log(`      Error: ${issue.error}`);
      }
    });
    console.log(`\n❌ TOTAL: ${issuesFound.length} issues found\n`);
  } else {
    console.log('🎉 NO ISSUES FOUND! All functionality working perfectly!\n');
  }

  // Overall assessment
  const totalTests = testsPassed.length + issuesFound.length;
  const successRate = totalTests > 0 ? ((testsPassed.length / totalTests) * 100).toFixed(1) : 0;
  
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`SUCCESS RATE: ${successRate}% (${testsPassed.length}/${totalTests})`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  if (successRate >= 95) {
    console.log('🌟 EXCELLENT! All core functionality working perfectly!');
  } else if (successRate >= 80) {
    console.log('👍 GOOD! Most functionality working, minor issues found.');
  } else if (successRate >= 60) {
    console.log('⚠️  ATTENTION NEEDED! Several issues require fixes.');
  } else {
    console.log('🚨 CRITICAL! Major functionality issues found.');
  }
  
  console.log('\n');
}

runDetailedValidation().catch(console.error);
