# ✍️ Conventional Commits Cheat Sheet

Every commit message in this project follows the **Conventional Commits** spec.
This powers automatic `CHANGELOG.md` generation and semantic versioning via Release Please.

---

## Format

```
<type>(<scope>): <short summary>

[optional body — explain WHY, not WHAT]

[optional footer — BREAKING CHANGE: ..., Closes #123]
```

**Rules:**
- Type and summary are **lowercase**
- Summary is **50 chars max**, no period at the end
- Body lines wrap at **72 chars**
- Use imperative mood: *"add feature"* not *"added feature"*

---

## Types & When to Use Them

| Type | Emoji | When | Changelog Section |
|------|-------|------|-------------------|
| `feat` | ✨ | New user-facing feature | ✨ Features |
| `fix` | 🐛 | Bug fix | 🐛 Bug Fixes |
| `perf` | ⚡ | Performance improvement, no API change | ⚡ Performance |
| `refactor` | ♻️ | Code restructure, no behavior change | ♻️ Refactoring |
| `docs` | 📚 | README, comments, wikis only | 📚 Documentation |
| `test` | 🧪 | Adding or fixing tests only | *(not in changelog)* |
| `chore` | 🔧 | Build scripts, CI, dependency bumps | 🔧 Maintenance |
| `ci` | 🤖 | GitHub Actions workflow changes | *(not in changelog)* |
| `cpp` | ⚙️ | C++ engine changes | ⚙️ C++ Engine |
| `revert` | ⏪ | Reverts a previous commit | *(auto-handled)* |

---

## Scopes (optional but recommended)

| Scope | Covers |
|-------|--------|
| `search` | Search endpoint, filters, ranking |
| `analytics` | Pandas/NumPy market analyzer |
| `cpp` | C++ engine source |
| `currency` | FX rate service |
| `db` | Migrations, schema, queries |
| `frontend` | Next.js UI components |
| `map` | Mapbox integration |
| `auth` | Authentication service |
| `infra` | Docker, Nginx, deployment |
| `ci` | GitHub Actions workflows |

---

## Real Examples

```bash
# Good ✅
feat(search): add radius filter using postgis st_dwithin
fix(currency): handle exchange rate api timeout with cached fallback
perf(cpp): replace sequential loop with simd-optimized haversine batch
refactor(analytics): extract percentile scoring into separate method
docs(db): add erd diagram and migration guide to readme
test(search): add integration tests for multi-currency price filtering
chore(infra): upgrade postgres image to 16.2-postgis
cpp(engine): add bbox pre-filter to skip postgis for obvious misses

# Breaking change ✅
feat(search)!: remove legacy v0 search endpoint

BREAKING CHANGE: /api/v0/search has been removed. Migrate to /api/v1/search.
See docs/migration/v0-to-v1.md for the upgrade guide.

Closes #87

# Bad ❌
git commit -m "fixed stuff"
git commit -m "WIP"
git commit -m "Update search.py"
git commit -m "feat: Added new Feature for Search Bar."  # uppercase, period
```

---

## Versioning Rules (automatic)

| Commit type | Version bump |
|-------------|-------------|
| `fix`, `perf`, `refactor` | `1.0.0` → `1.0.1` (patch) |
| `feat` | `1.0.0` → `1.1.0` (minor) |
| Any type with `!` or `BREAKING CHANGE:` | `1.0.0` → `2.0.0` (major) |

Release Please reads your commits on `main` and opens a PR with the version bump and generated CHANGELOG automatically. **You never edit CHANGELOG.md by hand.**

---

## Setup (one-time, run after cloning)

```bash
npm install   # installs commitlint + husky from package.json devDependencies
npx husky init
echo "npx commitlint --edit \$1" > .husky/commit-msg
chmod +x .husky/commit-msg
```

After this, any commit with a bad message will be **rejected locally** before it even reaches GitHub.
