#!/bin/bash
# Script to update all server prefixes from make-server-c142e950 to make-server-ce0d67b8

# Find all .tsx files and replace the old prefix with the new one
find . -name "*.tsx" -type f -exec sed -i '' 's/make-server-c142e950/make-server-ce0d67b8/g' {} +

echo "✅ Updated all occurrences of make-server-c142e950 to make-server-ce0d67b8"
