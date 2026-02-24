# 🏠 RealSearch — Global Real Estate Search Engine

[![CI](https://github.com/YOUR_USERNAME/realestate-search/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/realestate-search/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A high-performance, data-driven global real estate search engine with AI-powered market scoring, multi-currency support, and a C++-accelerated ranking engine.

---

## ⚡ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend API | Python 3.12, FastAPI |
| Performance Engine | C++17 + pybind11 |
| Data Analytics | Pandas, NumPy, SciPy |
| Database | PostgreSQL 16 + PostGIS, TimescaleDB |
| Search Index | Elasticsearch |
| Cache / Queue | Redis, Celery |
| Frontend | Next.js 14, Mapbox GL, Zustand |
| Infrastructure | Docker, Nginx, GitHub Actions |

---

## 🗂️ Monorepo Structure

```
realestate-search/
├── backend/              # FastAPI services
│   ├── services/
│   │   ├── search/       # Search & ranking endpoint
│   │   ├── analytics/    # Market analysis service
│   │   └── auth/         # User authentication
│   └── models/           # Pydantic schemas
├── analytics/            # Pandas/NumPy market analyzer
├── cpp/                  # C++ search engine (pybind11)
│   └── search_engine.cpp
├── frontend/             # Next.js 14 app
│   └── src/
│       ├── app/          # App router pages
│       └── components/   # UI components
├── database/
│   ├── migrations/       # SQL migration files
│   └── seeds/            # Development seed data
├── docker/               # Dockerfiles
├── .github/
│   ├── workflows/        # CI/CD pipelines
│   ├── ISSUE_TEMPLATE/   # Bug & feature templates
│   └── pull_request_template.md
└── docs/                 # Architecture docs
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker & Docker Compose
- CMake 3.18+ and a C++17 compiler

### 1. Clone & Configure
```bash
git clone git@github.com:YOUR_USERNAME/realestate-search.git
cd realestate-search
cp .env.example .env   # fill in your secrets
```

### 2. Build the C++ Engine
```bash
chmod +x build.sh && ./build.sh
```

### 3. Start with Docker Compose
```bash
docker compose up -d
```

### 4. Run Migrations
```bash
docker compose exec api python -m alembic upgrade head
```

### 5. Open the App
- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8001/docs
- **Analytics API:** http://localhost:8002/docs

---

## 🌿 Git Workflow

See [`docs/GIT_WORKFLOW.sh`](docs/GIT_WORKFLOW.sh) for the full phased commit plan.

**Summary:**
1. Create a feature branch from `main`: `git checkout -b feature/your-feature`
2. Commit with conventional commits (enforced by commitlint + husky)
3. Push and open a Pull Request
4. CI must be green (lint → tests → C++ build → frontend build)
5. One approval required → squash and merge

See [`docs/CONVENTIONAL_COMMITS.md`](docs/CONVENTIONAL_COMMITS.md) for commit message rules.

---

## 🔐 Branch Protection (configure on GitHub)

Go to **Settings → Branches → Add rule** for `main`:
- ✅ Require pull request before merging (1 approval)
- ✅ Require status checks: `lint`, `test-backend`, `build-cpp`, `test-frontend`
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings
- ✅ Restrict who can push to matching branches (add your team)

---

## 🤝 Contributing

1. Check the [Issues](../../issues) for open work
2. Comment on an issue to claim it
3. Follow the [commit conventions](docs/CONVENTIONAL_COMMITS.md)
4. Open a PR using the provided template

---

## 📄 License

MIT © 2024 RealSearch
