# Generate RSA keys using Node.js (since OpenSSL is not available)
Write-Host "Generating RSA keys using Node.js..." -ForegroundColor Yellow

# Create keys directory if it doesn't exist
if (!(Test-Path -Path "keys")) {
    New-Item -ItemType Directory -Path "keys" | Out-Null
    Write-Host "Created keys directory" -ForegroundColor Green
}

# Create a Node.js script to generate keys
$nodeScript = @"
const crypto = require('crypto');
const fs = require('fs');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs1',
    format: 'pem'
  }
});

fs.writeFileSync('keys/private.pem', privateKey);
fs.writeFileSync('keys/public.pem', publicKey);

console.log('Keys generated successfully!');
"@

# Write the script to a temporary file
$nodeScript | Out-File -FilePath "temp-keygen.js" -Encoding UTF8

# Run the Node.js script
node temp-keygen.js

# Clean up
Remove-Item "temp-keygen.js"

if ((Test-Path "keys/private.pem") -and (Test-Path "keys/public.pem")) {
    Write-Host "RSA keys generated successfully!" -ForegroundColor Green
    Write-Host "  - Private key: keys/private.pem" -ForegroundColor Gray
    Write-Host "  - Public key: keys/public.pem" -ForegroundColor Gray
} else {
    Write-Host "Failed to generate keys" -ForegroundColor Red
}
