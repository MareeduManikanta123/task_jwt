#!/usr/bin/env node

/**
 * Test utility to verify JWT structure meets all requirements
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');

const privateKey = fs.readFileSync('./keys/private.pem', 'utf8');
const publicKey = fs.readFileSync('./keys/public.pem', 'utf8');

// Create a test token
const testToken = jwt.sign(
  {
    roles: ['user']
  },
  privateKey,
  {
    algorithm: 'RS256',
    expiresIn: 900,
    issuer: 'secure-jwt-auth-service',
    subject: 'testuser',
    header: {
      typ: 'JWT'
    }
  }
);

console.log('\n=== JWT Structure Verification ===\n');

// Decode without verification to inspect header and payload
const decoded = jwt.decode(testToken, { complete: true });

console.log('Header:');
console.log(JSON.stringify(decoded.header, null, 2));

console.log('\nPayload:');
console.log(JSON.stringify(decoded.payload, null, 2));

// Verify the key requirements
const errors = [];
const warnings = [];

// Check header
if (decoded.header.alg !== 'RS256') {
  errors.push(`❌ Header 'alg' must be 'RS256', got '${decoded.header.alg}'`);
} else {
  console.log('\n✅ Header alg: RS256 ✓');
}

if (decoded.header.typ !== 'JWT') {
  warnings.push(`⚠️  Header 'typ' is '${decoded.header.typ || 'missing'}', should be 'JWT'`);
} else {
  console.log('✅ Header typ: JWT ✓');
}

// Check payload claims
if (!decoded.payload.iss) {
  errors.push('❌ Payload missing "iss" (Issuer) claim');
} else {
  console.log(`✅ Payload iss: ${decoded.payload.iss} ✓`);
}

if (!decoded.payload.sub) {
  errors.push('❌ Payload missing "sub" (Subject/Username) claim');
} else {
  console.log(`✅ Payload sub: ${decoded.payload.sub} ✓`);
}

if (!decoded.payload.iat) {
  errors.push('❌ Payload missing "iat" (Issued At) claim');
} else {
  console.log(`✅ Payload iat: ${decoded.payload.iat} ✓`);
}

if (!decoded.payload.exp) {
  errors.push('❌ Payload missing "exp" (Expiration) claim');
} else {
  const expiresInSeconds = decoded.payload.exp - decoded.payload.iat;
  if (expiresInSeconds === 900) {
    console.log(`✅ Payload exp: ${decoded.payload.exp} (expires in 900 seconds) ✓`);
  } else {
    errors.push(`❌ Token expiration should be 900 seconds, got ${expiresInSeconds}`);
  }
}

if (!Array.isArray(decoded.payload.roles)) {
  errors.push('❌ Payload "roles" must be an array');
} else {
  console.log(`✅ Payload roles: ${JSON.stringify(decoded.payload.roles)} ✓`);
}

// Verify signature
try {
  jwt.verify(testToken, publicKey, { algorithms: ['RS256'] });
  console.log('\n✅ Signature verified with public key ✓');
} catch (err) {
  errors.push(`❌ Signature verification failed: ${err.message}`);
}

console.log('\n=== Summary ===');
if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All JWT structure requirements met!\n');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(e));
  }
  if (warnings.length > 0) {
    console.log('\nWarnings:');
    warnings.forEach(w => console.log(w));
  }
  console.log('');
  process.exit(errors.length > 0 ? 1 : 0);
}
