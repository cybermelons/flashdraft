# FlashDraft Project Structure

## Directory Layout

```
flashdraft/
├── src/                    # Source code
│   ├── frontend/          # React frontend application
│   │   ├── components/    # UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── stores/       # Zustand state management
│   │   └── utils/        # Utility functions
│   │
│   ├── backend/           # Python backend
│   │   ├── api/          # FastAPI routes
│   │   ├── models/       # ML models and training
│   │   ├── services/     # Business logic
│   │   └── utils/        # Backend utilities
│   │
│   └── shared/           # Shared types and constants
│
├── data/                 # Data directory
│   ├── raw/             # Raw 17lands data
│   ├── processed/       # Processed datasets
│   └── models/          # Trained model files
│
├── docs/                # Documentation
│   ├── api/            # API documentation
│   ├── design/         # Design documents
│   └── guides/         # User guides
│
├── tests/              # Test suites
│   ├── frontend/       # Frontend tests
│   └── backend/        # Backend tests
│
├── scripts/            # Utility scripts
│   ├── download_data.py
│   └── train_models.py
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