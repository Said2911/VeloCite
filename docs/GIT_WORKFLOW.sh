# 🗂️ GitHub Upload Plan — Global Real Estate Search Engine
# Phased Commit Strategy (GitHub Flow)
# ============================================================
# Philosophy: Every commit = one logical, reviewable unit of work.
# Never push a broken state to main. Feature branches → PR → merge.
# ============================================================

# ─────────────────────────────────────────────────────────────
# PHASE 0 — Repository Bootstrap (push directly to main, once)
# ─────────────────────────────────────────────────────────────

git init
git remote add origin git@github.com:YOUR_USERNAME/realestate-search.git
git checkout -b main

# Copy in the scaffolding files first:
#   .gitignore, README.md, commitlint.config.js,
#   .github/ (all workflows + templates)

git add .gitignore README.md commitlint.config.js
git add .github/
git commit -m "chore: initialize monorepo with github flow scaffolding"

git add CHANGELOG.md   # empty stub
git commit -m "docs: add changelog stub for release-please"

git push -u origin main

# Enable branch protection on GitHub NOW before any feature work:
# Settings → Branches → Add rule → main
#   ✅ Require pull request before merging
#   ✅ Require status checks: lint, test-backend, build-cpp, test-frontend
#   ✅ Require branches to be up to date before merging
#   ✅ Do not allow bypassing the above settings


# ─────────────────────────────────────────────────────────────
# PHASE 1 — Database Schema
# Branch: feature/database-schema
# ─────────────────────────────────────────────────────────────

git checkout -b feature/database-schema

# Commit 1: Core table definitions
git add database/migrations/001_create_listings.sql
git commit -m "feat(db): add listings table with postgis geography column"

# Commit 2: Indexes (separate commit — easy to review/rollback)
git add database/migrations/002_add_indexes.sql
git commit -m "perf(db): add spatial and composite indexes for search queries"

# Commit 3: Price history + market snapshots
git add database/migrations/003_price_history.sql
git add database/migrations/004_market_snapshots.sql
git commit -m "feat(db): add price_history hypertable and market_snapshots"

# Commit 4: Seed / test data
git add database/seeds/
git commit -m "chore(db): add seed data for local development"

git push origin feature/database-schema
# → Open PR, get review, merge to main


# ─────────────────────────────────────────────────────────────
# PHASE 2 — C++ Search Engine
# Branch: feature/cpp-search-engine
# ─────────────────────────────────────────────────────────────

git checkout main && git pull
git checkout -b feature/cpp-search-engine

git add CMakeLists.txt
git commit -m "chore(cpp): add cmake build configuration with pybind11"

git add cpp/search_engine.cpp
git commit -m "feat(cpp): implement haversine geo scoring and bbox filter"

git add cpp/search_engine.cpp   # after adding rank_listings
git commit -m "feat(cpp): add composite listing ranking algorithm"

git add cpp/search_engine.cpp   # after adding normalize_prices
git commit -m "feat(cpp): add vectorized price normalization via numpy arrays"

git add build.sh
git commit -m "chore: add build script for cpp module compilation"

git add tests/cpp/test_search_engine.py
git commit -m "test(cpp): add smoke tests and ranking validation for c++ engine"

git push origin feature/cpp-search-engine
# → Open PR → CI builds C++ → merge


# ─────────────────────────────────────────────────────────────
# PHASE 3 — Backend Services
# Branch: feature/backend-core
# ─────────────────────────────────────────────────────────────

git checkout main && git pull
git checkout -b feature/backend-core

git add backend/requirements.txt backend/requirements-dev.txt
git commit -m "chore(backend): add python dependency manifests"

git add backend/main.py backend/config.py
git commit -m "chore(backend): scaffold fastapi app with lifespan and cors"

git add services/currency.py
git commit -m "feat(currency): add real-time fx rate service with redis caching"

git add services/search/main.py
git commit -m "feat(search): implement /api/v1/search endpoint with dynamic sql builder"

git add services/search/main.py   # after wiring in cpp ranking
git commit -m "perf(search): integrate c++ ranking engine into search response pipeline"

git add backend/models/
git commit -m "feat(backend): add pydantic request/response models"

git add tests/backend/
git commit -m "test(backend): add integration tests for search endpoint with mock db"

git push origin feature/backend-core
# → Open PR → CI runs lint + pytest → merge


# ─────────────────────────────────────────────────────────────
# PHASE 4 — Analytics Engine
# Branch: feature/analytics-engine
# ─────────────────────────────────────────────────────────────

git checkout main && git pull
git checkout -b feature/analytics-engine

git add analytics/__init__.py analytics/market_analyzer.py
git commit -m "feat(analytics): add market analyzer with pandas-based value scoring"

git add analytics/market_analyzer.py   # after adding price trend
git commit -m "feat(analytics): implement 30-day price trend via linear regression"

git add analytics/market_analyzer.py   # after adding report generation
git commit -m "feat(analytics): add market report generation with percentile distribution"

git add tests/analytics/
git commit -m "test(analytics): add unit tests for value score and trend computation"

git push origin feature/analytics-engine
# → Open PR → merge


# ─────────────────────────────────────────────────────────────
# PHASE 5 — Frontend
# Branch: feature/frontend-scaffold
# ─────────────────────────────────────────────────────────────

git checkout main && git pull
git checkout -b feature/frontend-scaffold

git add frontend/package.json frontend/tsconfig.json frontend/next.config.js
git commit -m "chore(frontend): scaffold next.js 14 app with typescript and tailwind"

git add frontend/src/app/
git commit -m "feat(frontend): add app router layout and homepage shell"

git add frontend/src/components/SearchBar/
git commit -m "feat(frontend): add search bar with country, city, price range filters"

git add frontend/src/components/Map/
git commit -m "feat(frontend): add mapbox gl map with listing pin clustering"

git add frontend/src/components/CurrencySwitcher/
git commit -m "feat(frontend): add currency switcher with real-time price conversion"

git add frontend/src/components/ListingCard/
git commit -m "feat(frontend): add listing card with value score badge and market position"

git push origin feature/frontend-scaffold
# → Open PR → CI builds next.js → merge


# ─────────────────────────────────────────────────────────────
# PHASE 6 — Docker & Infrastructure
# Branch: feature/docker-compose
# ─────────────────────────────────────────────────────────────

git checkout main && git pull
git checkout -b feature/docker-compose

git add docker/api.Dockerfile docker/frontend.Dockerfile
git commit -m "chore(docker): add multi-stage dockerfiles for api and frontend"

git add docker-compose.yml
git commit -m "chore(docker): add compose file with postgres, redis, api, frontend"

git add docker-compose.yml   # after adding nginx
git commit -m "chore(infra): add nginx reverse proxy config to compose stack"

git add .env.example
git commit -m "docs: add env.example with all required environment variables"

git push origin feature/docker-compose
# → Open PR → merge → triggers deploy job on CI


# ─────────────────────────────────────────────────────────────
# ONGOING — Day-to-day feature work template
# ─────────────────────────────────────────────────────────────

# Always start from an up-to-date main:
git checkout main && git pull origin main
git checkout -b feature/your-feature-name

# ... make changes, commit often with conventional commits ...

git commit -m "feat(search): add school proximity filter using postgis"
git commit -m "perf(cpp): optimize haversine with simd intrinsics"
git commit -m "fix(currency): handle api timeout with fallback cached rate"

git push origin feature/your-feature-name
# Open PR on GitHub → CI must be green → request review → squash + merge
