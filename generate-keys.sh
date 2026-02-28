#!/usr/bin/env sh
set -e

mkdir -p keys

openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem

chmod 600 keys/private.pem
chmod 644 keys/public.pem

echo "RSA key pair generated in ./keys"
