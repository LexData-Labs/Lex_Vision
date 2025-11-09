# 🚀 Lex Vision - Setup Guide

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Lex_Vision
```

### 2. Install Python Dependencies

```bash
# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Run the System

**Windows:**
```bash
start_system.bat
```

**Linux/Mac:**
```bash
python start_system.py
```

## First-Time Setup Checklist

- [ ] Python 3.8+ installed
- [ ] Node.js 16+ installed
- [ ] Virtual environment created and activated
- [ ] Python dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`cd frontend && npm install`)
- [ ] Camera connected and accessible
- [ ] Employee face images in `data/employee_faces/` directory

## Troubleshooting

See `HOW_TO_RUN.md` for detailed troubleshooting guide.

