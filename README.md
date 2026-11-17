# 🏠 VeloCite — Real Estate Search for Azerbaijan

[![CI](https://github.com/Said2911/VeloCite/actions/workflows/ci.yml/badge.svg)](https://github.com/Said2911/VeloCite/actions/workflows/ci.yml)

**🌐 Live demo: [velo-cite.vercel.app](https://velo-cite.vercel.app/)** — API: [velocite-api.onrender.com/docs](https://velocite-api.onrender.com/docs)

> Free hosting: the API sleeps when idle, so the first request after a break can take up to a minute.

VeloCite searches apartments and houses in all districts of Baku and in Sumgait,
Ganja, Mingachevir, Lankaran, Shaki, Gabala and Guba, and tells you whether each
one is a good deal. Every listing gets a **0–10 value score** from a Pandas
analytics engine, results can be ranked by a **C++ engine** (pybind11), and
prices are shown in **AZN (₼)** or converted to USD, EUR, TRY and GBP.

## ✨ Features

| | |
|---|---|
| 🔍 **Search** | City, Baku district, sale/rent, type, price, area, rooms, radius around a point; 7 sort orders; server-side pagination |
| 📊 **Value score** | Price per m² compared with similar homes in the same district (or city), with an age adjustment → `underpriced` / `fair_value` / `overpriced` |
| 📈 **Market analytics** | Median, average and p10–p90 price per m², breakdown by rooms, 30-day price trend per city, medians per Baku district |
| ⚙️ **C++ ranking** | "Relevance" sort combines value, distance, recency and completeness in C++ (identical Python fallback) |
| 💱 **Currencies** | AZN by default; live FX rates cached 15 min, with offline fallback rates |
| 🗺️ **Maps** | Map view of results and of each listing (Leaflet + OpenStreetMap, no API key) |
| 👤 **Accounts** | Register / sign in (JWT), saved listings, default currency |
| 🏢 **Listing page** | Key facts, score explanation, asking-price history, comparables, market snapshot |

## ⚡ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend API | Python 3.12, FastAPI, asyncpg |
| Ranking engine | C++17 + pybind11 (optional) |
| Analytics | Pandas, NumPy, SciPy |
| Database | PostgreSQL 16 + PostGIS |
| Cache | Redis (optional — in-memory fallback) |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Leaflet |
| Infrastructure | Docker Compose, Nginx, GitHub Actions |

## 🗂️ Project Structure

```
VeloCite/
├── backend/
│   ├── main.py            # app, startup (migrations, demo data, scoring), health check
│   ├── config.py          # settings from environment variables
│   ├── cache.py           # Redis with in-memory fallback
│   ├── db.py              # SQL migration runner
│   ├── deps.py            # auth / DB / admin dependencies
│   ├── models/            # Pydantic schemas (listings, users)
│   ├── routers/           # search, listings, markets, auth, favorites, admin
│   └── services/          # search, listings, ranking, currency, auth
├── analytics/
│   ├── market_analyzer.py # value scoring, market reports, price trends
│   └── scoring.py         # batch job: recompute all value scores
├── cpp/search_engine.cpp  # C++ ranking engine (module real_estate_engine)
├── scrapers/
│   ├── data_generator.py  # demo listings for Azerbaijan (price ranges in AZN)
│   └── bina_az_scraper.py # experimental, disabled by default
├── database/migrations/   # idempotent SQL migrations (run on API startup)
├── frontend/              # Next.js app: /, /search, /listings/[id], /login, /favorites, /account
├── docker/                # Dockerfiles + nginx.conf
├── tests/                 # pytest: analytics, search, ranking, auth, scrapers, C++ engine
└── .github/               # CI workflow, issue & PR templates
```

## 🚀 Quick Start (Docker)

```bash
git clone https://github.com/Said2911/VeloCite.git
cd VeloCite
docker compose up --build
```

On first start the API creates the tables, fills the empty database with
~1,400 demo listings (80 per Baku district / regional city) and computes their
value scores.

- **App:** http://localhost:3000
- **API docs (Swagger):** http://localhost:8001/docs
- **Health:** http://localhost:8001/health

To start again from an empty database: `docker compose down -v`.

## 🧑‍💻 Local Development

```bash
# 1. Database + Redis
docker compose up -d postgres redis

# 2. Backend (from the repo root)
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt -r backend/requirements-dev.txt
cp .env.example .env
uvicorn backend.main:app --reload --port 8001

# 3. Frontend
cd frontend && npm install && npm run dev               # http://localhost:3000

# 4. (Optional) C++ engine — the API uses the Python ranking without it
pip install pybind11
cmake -S . -B build -DPython_EXECUTABLE=$(which python) -Dpybind11_DIR=$(python -m pybind11 --cmakedir)
cmake --build build && cp build/real_estate_engine*.so .
```

## ⚙️ Configuration

All settings are environment variables (see [`.env.example`](.env.example)).

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:password@localhost:5432/velocite` | PostgreSQL with PostGIS |
| `REDIS_URL` | `redis://localhost:6379` | Leave empty to use the in-memory cache |
| `JWT_SECRET` | `change-me-in-production` | **Set a long random value in production** |
| `ADMIN_TOKEN` | *(unset → admin endpoints disabled)* | Header `X-Admin-Token` for `/api/v1/admin/*` |
| `AUTO_SEED` | `true` | Generate demo listings when the DB is empty |
| `SEED_LISTINGS_PER_MARKET` | `80` | Listings per Baku district / regional city |
| `CORS_ORIGINS` | `*` | Comma-separated allowed frontend origins |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8001` | API URL for the frontend (**build time**) |

## 📡 API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/search` | Filters (`city`, `district`, `listing_type`, prices…), `sort`, `page`, `currency`; returns `market_summary` |
| GET | `/api/v1/listings/{id}` | Listing + comparables + price history + segment market report |
| GET | `/api/v1/markets` | Per city and per district: counts, median price/m², 30-day trend |
| GET | `/api/v1/currencies` | Supported currencies and symbols |
| POST | `/api/v1/auth/register` · `/login` | Returns a JWT (`Authorization: Bearer …`) |
| GET / PATCH | `/api/v1/auth/me` | Current user / update name & default currency |
| GET | `/api/v1/favorites` · `/favorites/ids` | Saved listings |
| PUT / DELETE | `/api/v1/favorites/{id}` | Save / remove a listing |
| POST | `/api/v1/admin/seed` · `/admin/recompute-scores` | Maintenance (needs `X-Admin-Token`) |

Interactive documentation: `/docs`.

## 📐 How the value score works

1. A listing is compared with listings of the same **property type** and **sale/rent**
   in its **district** — or in the whole **city** when the district has fewer than 8 of them
   (segments with fewer than 5 listings are `insufficient_data`).
2. Its price per m² becomes a percentile in that segment (0 = cheapest):
   `score = 10 × (1 − percentile / 100)`.
3. Age adjustment: ±0.5% per year newer/older than the segment median, capped at ±10%.
4. ≤ 25th percentile → `underpriced`, ≤ 65th → `fair_value`, otherwise `overpriced`.

Scores are recomputed on startup and after seeding/scraping (`python -m analytics.scoring`).

## 🏷️ Data

The demo listings are **generated**, not real offers. Their prices per m² follow
2025–2026 market reviews for Azerbaijan (district ranges from the Azerbaijan
Chamber of Appraisers, the Baku median of about 2,700 ₼/m² for sale and 11 ₼/m²
per month for rent); regional cities without published statistics are estimates.

`scrapers/bina_az_scraper.py` is an **experimental** scraper for bina.az. It was
written without access to the live site, so its URL patterns and parsers must be
checked against the real pages first, and the site's terms of use respected. It
only runs with `docker compose --profile scrapers up`.

## ✅ Tests

```bash
pytest                               # analytics, search, ranking, auth, scrapers, cache, currency
PYTHONPATH=build pytest tests/cpp    # after building the C++ module
```

CI (GitHub Actions) runs Ruff + pytest, builds and tests the C++ engine, and lints
and builds the frontend.

## ☁️ Deployment

The live demo runs on free tiers:

| Part | Host | Config |
|---|---|---|
| Frontend | Vercel | Root directory `frontend`, env `NEXT_PUBLIC_API_URL` |
| API | Render (Docker, Frankfurt) | [`render.yaml`](render.yaml) blueprint; set `DATABASE_URL`, `CORS_ORIGINS` |
| Database | Neon (Postgres + PostGIS, Frankfurt) | the API creates the PostGIS extension and tables itself |

Notes:
- The database **must have PostGIS**.
- `docker/api.Dockerfile` listens on `$PORT` when the platform provides it.
- Build the frontend with `NEXT_PUBLIC_API_URL` pointing at the deployed API and add the
  frontend URL to `CORS_ORIGINS`.

## 🌿 Git Workflow

Commit messages follow [Conventional Commits](docs/CONVENTIONAL_COMMITS.md).

## 📄 License

MIT © 2026 VeloCite
