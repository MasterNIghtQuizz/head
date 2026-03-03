#!/bin/bash

# Configuration
KEYS_DIR="./keys"

# Create directory if it doesn't exist
mkdir -p "$KEYS_DIR"

echo "Generating RSA keys for access, refresh, and internal..."

# Generate access key pair
openssl genrsa -out "$KEYS_DIR/access-private.pem" 2048
openssl rsa -in "$KEYS_DIR/access-private.pem" -pubout -out "$KEYS_DIR/access-public.pem"

# Generate refresh key pair
openssl genrsa -out "$KEYS_DIR/refresh-private.pem" 2048
openssl rsa -in "$KEYS_DIR/refresh-private.pem" -pubout -out "$KEYS_DIR/refresh-public.pem"

# Generate internal key pair
openssl genrsa -out "$KEYS_DIR/internal-private.pem" 2048
openssl rsa -in "$KEYS_DIR/internal-private.pem" -pubout -out "$KEYS_DIR/internal-public.pem"

echo "Keys generated successfully in $KEYS_DIR"
echo "Remember to NEVER commit these keys!"
