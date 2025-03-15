#!/bin/bash
# Check if bun is available
if command -v bun &> /dev/null; then
    echo "Installing dependencies with Bun..."
    bun install
else
    echo "Bun not available, falling back to npm..."
    npm install
fi 