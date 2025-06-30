# issues

1. auto-save timing: the engine should save after each user action.
2. ui loads from its ui state first, while waiting draft state. it can hydrate in place without anyone noticing. maybe SSR improves this
3. if localstorage is full, throw errors and make sure it's added to a log for visibility. it should print some sort of audit of our storage
4. the same draft in multiple tabs should sync through the localstorage, right? is there some HTML5 wizardry for this.
5. the engine is a singleton. explain what it would be per draft.


# FlashDraft Project Structure

## Directory Layout

```
flashdraft/
├── src/                    # Source code
│   ├── components/    # UI components
│   ├── pages/        # Page components
│   ├── hooks/        # Custom React hooks
│   ├── stores/       # Zustand state management
│   └── utils/        # Utility functions
│   └── shared/           # Shared types and constants
│
├── draft-ai/                 # ai draft-model training
│   └── TBD
│
├── docs/                # Documentation
│   ├── api/            # API documentation
│   ├── design/         # Design documents
│   └── guides/         # User guides
│
├── tests/              # Test suites
│
└── public/             # Static assets
    └── images/         # Card images, icons
```

## Key Components

### Frontend (React + TypeScript)
- **Draft Interface**: Pack display, card selection, pick tracking
- **Playmat Interface**: Drag-and-drop card manipulation
- **State Management**: Zustand for global state
- **Styling**: Tailwind CSS for responsive design

### Backend (FastAPI + Python)
- **Draft API**: Pack generation, bot picks, draft state
- **ML Service**: Bot decision making using trained models
- **Data Service**: 17lands data processing and caching
- **WebSocket**: Real-time draft updates

### Data Pipeline
- **ETL**: Extract from 17lands, transform, load to database
- **Feature Engineering**: Card synergy, color signals, pick context
- **Model Training**: Pairwise ranking models for realistic bots

## Development Workflow

1. **Data Preparation**
   ```bash
   python scripts/download_data.py --set BRO
   python scripts/process_data.py
   ```

2. **Model Training**
   ```bash
   python scripts/train_models.py --model pairwise
   ```

3. **Development**
   ```bash
   # Terminal 1 - Backend
   cd src/backend
   uvicorn main:app --reload

   # Terminal 2 - Frontend
   npm run dev
   ```

4. **Testing**
   ```bash
   # Backend tests
   pytest tests/backend

   # Frontend tests
   npm test
   ```
