# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlashDraft is an MTG (Magic: The Gathering) draft simulator and playtesting platform built with Astro, React, and Python. The core workflow is: Draft → Deck Building → Goldfishing → Iteration. The platform combines AI-powered draft opponents trained on 17lands data with a streamlined digital playmat for rapid deck testing and learning.

## Development Commands

### Frontend Development
```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Code quality
pnpm lint
pnpm format
```

### Backend Development
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run backend tests
pytest tests/backend

# Data processing
python scripts/download_data.py --set ACR
python scripts/process_data.py
python scripts/train_models.py --model pairwise
```

### Initial Setup
```bash
# Run setup script to create directory structure
./setup.sh

# Install all dependencies
pnpm install && pip install -r requirements.txt
```

## Development Best Practices

- **Package Management**: Always use pnpm or pnpx instead of npm/npx

[... rest of the existing file content remains unchanged ...]