#!/bin/bash

# FlashDraft Setup Script

echo "Setting up FlashDraft repository..."

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    git init
    echo "Git repository initialized"
fi

# Create additional directories
mkdir -p src/frontend/components
mkdir -p src/frontend/pages
mkdir -p src/frontend/hooks
mkdir -p src/frontend/stores
mkdir -p src/frontend/utils

mkdir -p src/backend/api
mkdir -p src/backend/models
mkdir -p src/backend/services
mkdir -p src/backend/utils

mkdir -p src/shared

mkdir -p data/raw
mkdir -p data/processed
mkdir -p data/models

mkdir -p tests/frontend
mkdir -p tests/backend

mkdir -p scripts
mkdir -p public/images

echo "Directory structure created"

# Make initial commit
git add -A
git commit -m "Initial commit: FlashDraft MTG draft simulator project setup"

echo "FlashDraft repository setup complete!"
echo ""
echo "Next steps:"
echo "1. Install dependencies: npm install && pip install -r requirements.txt"
echo "2. Set up environment variables: cp .env.example .env"
echo "3. Start development: npm run dev"