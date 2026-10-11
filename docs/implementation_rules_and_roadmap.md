# Implementation Rules & Roadmap: URL Shortener & Analytics System

**Document Version:** 1.0.0  
**Project Name:** `url_shortner`  
**System Type:** Backend RESTful Microservice  
**Target Audience:** Tech Leads, Senior Engineers, New Team Onboarders, QA Leads, and Technical Interviewers  
**Companion Documents:**  
* Document 1: `docs/project_requirement_description.md` (PRD)  
* Document 2: `docs/architecture_overview.md` (Architecture Overview)  
* Document 3: `docs/tech_stack_and_dependencies.md` (Tech Stack & Dependencies)  
* Document 4: `docs/data_model_and_database_schema.md` (Data Model & Database Schema)  
* Document 5: `docs/api_interface_spec.md` (API & Interface Specification)

---

## 1. Implementation Summary

### Plain-Language Summary
The codebase is a modular, layered JavaScript application built with native ECMAScript Modules (`"type": "module"`) on Node.js 22 and Express 5. Source code is organized by technical responsibility into routes, controllers, services, models, middlewares, database clients, and utilities. Coding conventions enforce semi-colon-free JavaScript with single quotes, 2-space indentation, and standard camelCase naming, governed by ESLint and Prettier. The project uses in-memory databases (`mongodb-memory-server`, `redis-memory-server`) to keep Jest integration test suites completely decoupled from external development infrastructure, and provides Docker Compose recipes for local multi-container development.

### 30-Second Spoken Pitch (Implementation Edition)
> "Our codebase follows a clean Controller-Service-Repository pattern across isolated layers in `src/`. We enforce formatting and code cleanliness with ESLint and Prettier, rejecting semicolons and utilizing 2-space indentation. All operational errors bubble up through custom `AppError` instances into a central error middleware, while controllers are wrapped in `asyncHandler` to eliminate try/catch noise. Testing is handled in Jest using in-memory MongoDB and Redis servers, meaning developers can run the entire test suite locally without needing external databases running."

### The "Commercial Kitchen" Analogy
Think of this codebase like a **professional restaurant kitchen**:
* **The Prep Stations (`src/route/` & `src/controller/`):** The front counter where orders are taken, tickets are printed, and items are handed to customers on standard trays (`ApiResponse`).
* **The Master Chefs (`src/service/`):** The back line where all cooking and business logic happens—Base62 conversions, Redis lookups, and MongoDB aggregations.
* **The Pantry (`src/model/` & `src/db/`):** The organized shelves where ingredients are kept, labeled with strict expiration dates (TTL indexes).
* **The Sanitation Rules (Prettier & ESLint):** Strict kitchen hygiene rules—no stray semicolons on the floor, clean single quotes on all labels, and immediate warnings if an ingredient is left unused (`no-unused-vars`).

---

## 2. Folder and File Structure

### Complete Repository Tree
```text
url_shortner/
├── .dockerignore                  # Files excluded from Docker container builds
├── .eslintignore                  # Files excluded from ESLint static analysis
├── .eslintrc.js                   # ESLint rule configuration (ES2022, Prettier, Node)
├── .gitignore                     # Git tracking exclusions (logs, node_modules, coverage)
├── .prettierignore                # Files excluded from Prettier automated formatting
├── .prettierrc                    # Prettier formatting rules (no semi, single quotes, 2 spaces)
├── babel.config.js                # Babel transformation presets for Jest testing
├── docker-compose.yaml            # Multi-container orchestration (App, MongoDB, Redis)
├── Dockerfile                     # Container image recipe (Node 22-slim)
├── jest.config.js                 # Jest test runner configuration with coverage setup
├── package.json                   # Project metadata, dependencies, and NPM scripts
├── package-lock.json              # Deterministic dependency lockfile
├── README.md                      # High-level developer documentation & setup guide
├── docs/                          # Comprehensive system documentation
│   ├── api_interface_spec.md      # Document 5: Complete API & interface specification
│   ├── architecture_overview.md   # Document 2: Technical architecture & sequence diagrams
│   ├── data_model_and_database_schema.md # Document 4: Schemas, indexes & queries
│   ├── implementation_rules_and_roadmap.md # Document 6: This document
│   ├── project_requirement_description.md # Document 1: Business PRD & functional requirements
│   ├── README.md                  # Documentation folder index
│   └── tech_stack_and_dependencies.md # Document 3: Deep dive into all libraries
├── load/                          # k6 load testing scripts
│   ├── analytics.test.js          # Load tests for single-code analytics endpoint
│   ├── createShortURL.test.js     # Load tests for short URL creation endpoint
│   └── redirect.test.js           # Load tests for HTTP 307 redirection throughput
├── tests/                         # Automated test suites
│   ├── setup.js                   # In-memory Mongo and Redis test lifecycle harness
│   ├── integration/               # End-to-end integration tests using Supertest
│   │   ├── analytic.test.js       # Tests for /api/v1/analysis routes and CSV exports
│   │   └── url.test.js            # Tests for /api/v1/url routes and /:shortCode redirects
│   └── unit/                      # Isolated unit tests
│       ├── services/              # Unit tests for urlService and analyticService
│       │   ├── analyticService.test.js
│       │   └── urlService.test.js
│       └── util/                  # Unit tests for validation, hashing, and error classes
│           ├── ApiError.test.js
│           ├── ApiResponse.test.js
│           ├── asyncHandler.test.js
│           ├── hashGenerator.test.js
│           └── validation.test.js
└── src/                           # Application source code
    ├── index.js                   # Application entry point; Express app setup & server listen
    ├── controller/                # Request handlers; parses HTTP payloads & formats responses
    │   ├── analysis.controller.js # Handlers for analytics, trends, and CSV reports
    │   ├── url.controller.js      # Handlers for link creation and redirection
    │   └── urlList.controller.js  # Handler for active link listing
    ├── db/                        # Database connection initialization
    │   ├── connection.db.js       # MongoDB connection client via Mongoose
    │   └── redisClient.js         # Redis client connection and LRU cache configuration
    ├── middleware/                # Express middleware
    │   ├── error.middleware.js    # Global error interceptor and JSON error formatter
    │   └── limiter.middleware.js  # Redis-backed rate limiting middleware
    ├── model/                     # Mongoose schema definitions
    │   ├── analysis.model.js      # Analytics click event schema
    │   ├── counter.model.js       # Atomic sequence counter schema
    │   ├── emailservice.model.js  # Email notification schema (scaffolded / unused)
    │   └── url.model.js           # Short URL document schema with TTL index
    ├── route/                     # Express route registrations
    │   ├── analysis.router.js     # /api/v1/analysis route declarations
    │   ├── redirection.router.js  # /:shortCode redirection route declarations
    │   └── url.router.js          # /api/v1/url route declarations
    ├── service/                   # Pure business logic and database queries
    │   ├── analyticService.js     # MongoDB aggregation pipelines & CSV parsing
    │   └── urlService.js          # Base62 generation, caching, redirect, & telemetry
    └── util/                      # Shared utilities, classes, and validators
        ├── ApiError.js            # Custom operational error class (AppError)
        ├── ApiResponse.js         # Standard JSON response structure class
        ├── asyncHandler.js        # Controller try/catch wrapper utility
        ├── env.js                 # Environment variable loader
        ├── hashGenerator.js       # Base62 encoding implementation using BigInt
        ├── logger.js              # Pino structured JSON logger
        └── validation.js          # Zod schemas and URL validation functions
```

### Folder Placement Rules
* **New Route Declaration:** Must be placed in `src/route/` and named `<resource>.router.js`.
* **New HTTP Handler:** Must be placed in `src/controller/` and named `<resource>.controller.js`.
* **New Business Logic / DB Query:** Must be placed in `src/service/` and named `<resource>Service.js`.
* **New Mongoose Schema:** Must be placed in `src/model/` and named `<resource>.model.js`.
* **New Express Middleware:** Must be placed in `src/middleware/` and named `<purpose>.middleware.js`.
* **New Helper / Validator:** Must be placed in `src/util/` and named `<purpose>.js`.

### Structural Violations in the Codebase
1. **Model Querying Directly Inside Controller:**  
   * **File:** `src/controller/urlList.controller.js` (lines 6–10)  
   * **Violation:** Imports `shortURL` directly from `src/model/url.model.js` and performs database queries inside the controller, bypassing `src/service/urlService.js`.
2. **HTTP Object Leaking Into Service Tier:**  
   * **File:** `src/service/urlService.js` (lines 64–70)  
   * **Violation:** `urlRedirectionService(shortCode, req)` accepts the Express `req` object directly to extract IP and headers, coupling the service layer to the Express HTTP framework.

---

## 3. Naming Conventions

### Established Conventions

| Artifact Type | Naming Convention | Real Code Example | Defining File |
| :--- | :--- | :--- | :--- |
| **Folders** | Lowercase singular | `src/controller`, `src/model`, `src/service` | Repository Root |
| **Route Files** | `<name>.router.js` (lowercase) | `url.router.js`, `analysis.router.js` | `src/route/` |
| **Controller Files** | `<name>.controller.js` (camelCase) | `url.controller.js`, `urlList.controller.js`| `src/controller/` |
| **Service Files** | `<name>Service.js` (camelCase) | `urlService.js`, `analyticService.js` | `src/service/` |
| **Model Files** | `<name>.model.js` (lowercase) | `url.model.js`, `counter.model.js` | `src/model/` |
| **Middleware Files** | `<name>.middleware.js` (lowercase) | `error.middleware.js`, `limiter.middleware.js`| `src/middleware/` |
| **Functions** | `camelCase` (verb-noun) | `shortURLGeneratorService()`, `exportAnalyticsCSV()` | `src/service/` |
| **Variables / DTOs** | `camelCase` | `validatedCode`, `remainingTime`, `mockPayload` | `src/service/urlService.js` |
| **Classes** | `PascalCase` | `AppError`, `ApiResponse` | `src/util/ApiError.js` |
| **Mongoose Models** | Mixed (`shortURL`, `Analytics`, `Counter`) | `mongoose.model('shortURL', urlSchema)` | `src/model/url.model.js` |
| **Environment Keys** | `UPPER_SNAKE_CASE` | `MONGODB_URI`, `CLIENT_URL`, `BASE_URL` | `src/util/env.js` |
| **Redis Keys** | `prefix:<identifier>` | `url:17K1jt`, `map:17K1jt`, `stats:id` | `src/service/urlService.js` |

### Identified Naming Inconsistencies
* **Inconsistent Utility Class File Naming:** `src/util/ApiError.js` and `src/util/ApiResponse.js` use `PascalCase`, while all other utilities in `src/util/` use `camelCase` (`asyncHandler.js`, `hashGenerator.js`, `validation.js`).
* **Inconsistent Model File Naming:** `src/model/emailservice.model.js` is lowercase without word separators, whereas controllers and services use camelCase (`urlList.controller.js`, `analyticService.js`).
* **Inconsistent Mongoose Model Identifiers:** `src/model/url.model.js` registers `'shortURL'` (camelCase), while `src/model/analysis.model.js` registers `'Analytics'` (PascalCase).

---

## 4. Coding Conventions and Patterns

### Code Formatting & Linting Rules
* **Prettier (`.prettierrc`):**
  * Semicolons: `false` (Strictly omitted at statement ends).
  * Quotes: `singleQuote: true` (Single quotes for strings).
  * Trailing Commas: `es5` (Enabled on multi-line objects/arrays).
  * Print Width: `100` characters.
  * Tab Width: `2` spaces.
  * Arrow Parens: `always` (`(x) => ...`).
* **ESLint (`.eslintrc.js`):**
  * Unused variables: `'warn'` with pattern `{ argsIgnorePattern: '^_' }`.
  * Console logs: `'off'`.
  * Undefined variables: `'error'`.

### Established Architectural Patterns

#### 1. Controller Async Wrapper Pattern
Controllers never use explicit `try/catch` blocks. Instead, they are wrapped in `asyncHandler` (`src/util/asyncHandler.js`), which forwards rejected promises to the global error middleware:
```javascript
// src/controller/url.controller.js
export const shortURLGenerator = asyncHandler(async (req, res) => {
  const data = req.body
  const shortURL = await shortURLGeneratorService(data)
  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, 'Short URL Generated Successfully.', shortURL))
})
```

#### 2. Operational Error Throwing Pattern
Business logic throws instances of `AppError` (`src/util/ApiError.js`) with specific HTTP status codes:
```javascript
// src/service/urlService.js
if (!originalURL || originalURL.isActive === false) {
  throw new AppError('URL not exist or expired', StatusCodes.NOT_FOUND)
}
```

#### 3. Standard JSON Response Formatting Pattern
Controllers wrap all successful JSON payloads inside `ApiResponse` (`src/util/ApiResponse.js`):
```javascript
// src/controller/analysis.controller.js
return res
  .status(StatusCodes.OK)
  .json(new ApiResponse(StatusCodes.OK, 'Everything is working', result))
```

#### 4. Cache-Aside Fallback Pattern
The service reads Redis first within a `try/catch` block, falling back to MongoDB if Redis throws an error:
```javascript
// src/service/urlService.js
try {
  longURL = await redis.get(`url:${validatedCode}`)
} catch (redisError) {
  logger.error('Redis Get Failed, falling back to DB:', redisError)
}
```

### Anti-Patterns Present in Code (Do NOT Replicate)
1. **Unawaited Fire-and-Forget Promises (`src/service/urlService.js`, line 106):** Calling `captureAnalytics(...).catch(...)` without a durable queue risks event loss on container restarts.
2. **Hardcoded Timezones in Aggregations (`src/service/analyticService.js`, line 191):** Hardcoding `+05:30` IST offset in database pipelines makes time-series data inaccurate for non-Indian users.
3. **Loopback IP Replacement Hack (`src/service/urlService.js`, line 66):** Hardcoding `47.15.230.222` to replace `::1` during local testing should be an environment-driven mock rather than production code.

---

## 5. How to Add Common Things (Step-by-Step Recipes)

---

### Recipe 1: Add a New API Endpoint
* **Goal:** Add an endpoint `DELETE /api/v1/url/:shortCode` to soft-delete a short link.

#### Step 1: Update the Route Declaration
Open `src/route/url.router.js` and register the route:
```javascript
// src/route/url.router.js
import { deleteShortURL } from '../controller/url.controller.js'
import { redirectLimiter } from '../middleware/limiter.middleware.js'

urlRouter.route('/:shortCode').delete(redirectLimiter, deleteShortURL)
```

#### Step 2: Implement the Controller Method
Open `src/controller/url.controller.js` and add:
```javascript
// src/controller/url.controller.js
import { deleteShortURLService } from '../service/urlService.js'

export const deleteShortURL = asyncHandler(async (req, res) => {
  const { shortCode } = req.params
  await deleteShortURLService(shortCode)
  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, 'Short URL deactivated successfully.'))
})
```

#### Step 3: Implement the Service Logic & Invalidate Cache
Open `src/service/urlService.js` and add:
```javascript
// src/service/urlService.js
export const deleteShortURLService = async (shortCode) => {
  const validatedCode = validShortCode(shortCode)
  const link = await shortURL.findOneAndUpdate(
    { shortCode: validatedCode, isActive: true },
    { isActive: false },
    { new: true }
  )
  if (!link) {
    throw new AppError('URL not found or already deactivated', StatusCodes.NOT_FOUND)
  }
  // Invalidate Redis cache
  await redis.del(`url:${validatedCode}`).catch((err) => logger.error('Cache Evict Failed:', err))
}
```

#### Step 4: Write the Automated Integration Test
Open `tests/integration/url.test.js` and add:
```javascript
test('DELETE /api/v1/url/:shortCode should soft-delete link and clear cache', async () => {
  const code = 'DEL123'
  await shortURL.create({ orgURL: 'https://test.com', shortCode: code, isActive: true })
  await redis.set(`url:${code}`, '{"url":"https://test.com"}')

  const res = await request(app).delete(`/api/v1/url/${code}`)
  expect(res.status).toBe(200)

  const updated = await shortURL.findOne({ shortCode: code })
  expect(updated.isActive).toBe(false)

  const cache = await redis.get(`url:${code}`)
  expect(cache).toBeNull()
})
```

---

### Recipe 2: Add a New Database Field to an Existing Entity
* **Goal:** Add a `customAlias` (String, optional, unique) field to the `shortURL` collection.

#### Step 1: Update the Mongoose Schema
Open `src/model/url.model.js` and add the field:
```javascript
// src/model/url.model.js
const urlSchema = new Schema({
  // ... existing fields
  customAlias: {
    type: String,
    sparse: true,
    unique: true,
    trim: true,
  },
})
```

#### Step 2: Add Validation Rules
Open `src/util/validation.js` and add an alias validator:
```javascript
// src/util/validation.js
export const validCustomAlias = (alias) => {
  if (!alias) return null
  const schema = z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid alias characters')
  if (!schema.safeParse(alias).success) {
    throw new AppError('Invalid custom alias format', StatusCodes.BAD_REQUEST)
  }
  return alias
}
```

#### Step 3: Update the Service to Persist the Field
In `src/service/urlService.js`, extract `customAlias` from `data`, validate it, and include it in `shortURL.create(...)`.

---

### Recipe 3: Add a New Environment Variable
* **Goal:** Add an environment variable `MAX_REDIRECT_CACHE_SECONDS` to control cache duration.

#### Step 1: Update `.env.docker` and Local `.env`
Add the variable:
```env
MAX_REDIRECT_CACHE_SECONDS=3600
```

#### Step 2: Update the Environment Config Loader
Open `src/util/env.js` and export the key:
```javascript
// src/util/env.js
export const ENV = {
  // ... existing variables
  MAX_REDIRECT_CACHE_SECONDS: parseInt(process.env.MAX_REDIRECT_CACHE_SECONDS, 10) || 3600,
}
```

#### Step 3: Reference the Variable in Application Logic
Open `src/service/urlService.js` and replace hardcoded `3600` with `ENV.MAX_REDIRECT_CACHE_SECONDS`.

---

## 6. Error Handling and Logging Rules

### Rules for Throwing and Formatting Errors
1. **Never throw generic JavaScript `Error` in business logic:** Always throw `AppError` with an explicit `StatusCodes` code (`src/util/ApiError.js`).
2. **Never swallow errors silently in background tasks:** Unawaited promises must include a `.catch((err) => logger.error(...))` handler (`src/service/urlService.js`, line 107).
3. **All controllers must be wrapped in `asyncHandler`:** Ensures unhandled promise rejections are forwarded to the global error middleware (`src/util/asyncHandler.js`).

### Logging Rules & PII Hygiene
* **Use Pino Exclusively:** Use `logger.info()`, `logger.warn()`, and `logger.error()` (`src/util/logger.js`). Avoid `console.log()` in production code.
* **Never Log Secrets or Tokens:** `ENV.MONGODB_URI` and `ENV.REDIS_URL` must never be logged.
* **PII Hygiene Review:** The current error middleware logs `req.path` and `req.method`. Client IP addresses are extracted in `urlRedirectionService` and written directly to MongoDB. To comply with privacy standards, client IPs should be masked prior to logging or storage.

---

## 7. Configuration and Secrets

### How Configuration is Loaded
* Managed via `dotenv` in `src/util/env.js`.
* Loaded once at startup and exposed via the immutable `ENV` object:
  ```javascript
  // src/util/env.js
  export const ENV = {
    PORT: process.env.PORT,
    CLIENT_URL: process.env.CLIENT_URL,
    MONGODB_URI: process.env.MONGODB_URI,
    BASE_URL: process.env.BASE_URL,
    REDIS_URL: process.env.REDIS_URL,
  }
  ```

### Hardcoded Secret & Sensitivity Audit
* **No Hardcoded Passwords or API Keys:** No hardcoded production database passwords or API keys exist in the repository.
* **Hardcoded IP in Code:** `src/service/urlService.js` (line 66) contains a hardcoded public IP address: `req.ip === '::1' ? '47.15.230.222' : req.ip`.  
  * *Resolution:* Replace this with an environment-based override (`process.env.DEV_MOCK_IP`).

---

## 8. Testing Standards

### Test Architecture & Layout
```text
tests/
├── setup.js                   # In-memory Mongo & Redis lifecycle
├── integration/               # Supertest API tests
│   ├── analytic.test.js       # Global and single-link analytics tests
│   └── url.test.js            # Link generation and redirect tests
└── unit/                      # Isolated unit tests
    ├── services/              # urlService & analyticService mock tests
    └── util/                  # validation, hashing, & error class tests
```

### Feature Test Coverage Matrix

| Feature ID | Feature Name | Test Coverage Location | Status |
| :--- | :--- | :--- | :--- |
| **F-1** | Atomic Base62 Short URL Generation | `tests/integration/url.test.js`, `tests/unit/util/hashGenerator.test.js` | **Fully Covered** |
| **F-2** | Configurable URL Expiration (TTL) | `tests/integration/url.test.js` | **Fully Covered** |
| **F-3** | Sub-10ms Cached Redirection | `tests/integration/url.test.js`, `tests/unit/services/urlService.test.js` | **Fully Covered** |
| **F-4** | Non-Blocking Click Telemetry Capture | `tests/integration/url.test.js`, `tests/unit/services/urlService.test.js` | **Fully Covered** |
| **F-5** | Global Multi-Faceted Analytics Dashboard | `tests/integration/analytic.test.js` | **Fully Covered** |
| **F-6** | Single-Code Cached Analytics Breakdown | `tests/integration/analytic.test.js`, `tests/unit/services/analyticService.test.js` | **Fully Covered** |
| **F-7** | Hourly and Daily Trend Telemetry | `tests/unit/services/analyticService.test.js` | **Fully Covered** |
| **F-8** | CSV Analytics Report Export | `tests/unit/services/analyticService.test.js` | **Fully Covered** |
| **F-9** | Multi-Tier Redis Rate Limiting | `load/createShortURL.test.js` (k6 load test) | **Partial (Load Only)** |
| **F-10** | Active URL Listing | Untested in unit/integration suites | **Untested Gap** |

### How to Run Tests
```bash
# Run all unit and integration tests with coverage
npm test

# Run tests in watch mode during development
npx jest --watch

# Run a single test file
npx jest tests/integration/url.test.js
```

---

## 9. Git and Collaboration Workflow

* **Current Status in Repository:** **Not found in repo.** No `.github/` folder, PR templates, or `CONTRIBUTING.md` currently exist.
* **[SUGGESTED] Git Collaboration Standard:**
  * **Branch Naming:**
    * Features: `feat/F-<id>-short-description` (e.g., `feat/F-10-url-pagination`).
    * Bug Fixes: `fix/short-description` (e.g., `fix/last-clicked-at-null`).
  * **Commit Message Format (Conventional Commits):**
    * `feat(url): add pagination support to active link listing`
    * `fix(analytics): accept dynamic timezone in trend aggregation`
    * `test(service): add unit tests for urlService deletion`
  * **Pull Request Checklist:** Every PR must include passing unit/integration tests and zero ESLint errors before merging.

---

## 10. Build, Run, and Deployment Workflow

### Available NPM Scripts (`package.json`)

| Command | Action Executed | Purpose in Development Lifecycle |
| :--- | :--- | :--- |
| `npm run lint` | `eslint .` | Runs static analysis and flags syntax and styling errors. |
| `npm run lint:fix` | `eslint . --fix` | Automatically fixes autofixable ESLint errors. |
| `npm run format` | `prettier . --write` | Formats the entire codebase according to `.prettierrc`. |
| `npm run dev` | `cross-env NODE_ENV=development nodemon src/index.js` | Starts server with file-watching and hot-reloading. |
| `npm test` | `cross-env NODE_ENV=test jest` | Runs full automated test suite with coverage reporting. |
| `npm start` | `cross-env NODE_ENV=production node src/index.js` | Starts server in production mode. |

### CI/CD Deployment Pipeline *(Status: Not found in repo)*
* **[SUGGESTED] GitHub Actions Pipeline (`.github/workflows/ci.yml`):**
  1. Trigger on `push` and `pull_request` to `main`.
  2. Setup Node.js 22.
  3. Run `npm ci`.
  4. Run `npm run lint`.
  5. Run `npm test`.
  6. Build and push Docker image to registry.

---

## 11. Definition of Done

A task is considered complete when all of the following criteria are satisfied:

* [ ] **Layering Respected:** Business logic is isolated in `src/service/`; controllers only orchestrate requests.
* [ ] **Error Handling:** Throws `AppError` with explicit `StatusCodes`; no unhandled promise rejections.
* [ ] **Validation:** All incoming request parameters and body fields are validated using Zod or `src/util/validation.js`.
* [ ] **Code Formatting:** `npm run format` passes with zero modifications.
* [ ] **Linting Cleanliness:** `npm run lint` completes with zero errors and zero warnings.
* [ ] **Automated Tests:** Comprehensive unit and integration tests are added in `tests/unit/` and `tests/integration/`.
* [ ] **Test Execution:** `npm test` passes with 100% of test suites green.
* [ ] **Cache Coherence:** If database records are modified or deleted, corresponding Redis keys are evicted.
* [ ] **[SUGGESTED] Documentation Updated:** Companion documentation in `docs/` is updated to reflect new endpoints or schema changes.

---

## 12. Recommended Reading Order

### 15 Core Files to Read First

| Step | File Path | Why It Matters & What to Look For |
| :--- | :--- | :--- |
| **1** | `package.json` | Inspect project dependencies, module system type (`"type": "module"`), and run scripts. |
| **2** | `src/index.js` | Understand application bootstrap, middleware sequence, and router mounting. |
| **3** | `src/util/env.js` | See how environment variables are loaded and structured. |
| **4** | `src/util/ApiError.js` | Understand custom operational error wrapping. |
| **5** | `src/util/ApiResponse.js` | See the standard JSON response format used across all endpoints. |
| **6** | `src/middleware/error.middleware.js` | Observe how exceptions are caught, logged, and formatted into HTTP responses. |
| **7** | `src/middleware/limiter.middleware.js` | Learn how Redis-backed rate limiting protects the API across 3 tiers. |
| **8** | `src/model/counter.model.js` | Understand the atomic sequence counter schema. |
| **9** | `src/util/hashGenerator.js` | Inspect the Base62 mathematical algorithm using BigInt. |
| **10** | `src/model/url.model.js` | Study the URL schema, TTL expiration index, and soft-delete flag. |
| **11** | `src/service/urlService.js` | The core service file. Trace Base62 generation, Redis caching, and async telemetry. |
| **12** | `src/model/analysis.model.js` | Inspect the click telemetry document schema and compound indexes. |
| **13** | `src/service/analyticService.js` | Review MongoDB `$facet` aggregation pipelines and the two-tier Redis stats cache. |
| **14** | `tests/setup.js` | Learn how in-memory MongoDB and Redis servers are orchestrated for tests. |
| **15** | `tests/integration/url.test.js` | See real Supertest integration test patterns validating the complete system. |

### Onboarding Learning Schedule
* **Day 1 (Architecture & Setup):** Clone repository, run `npm install`, read files 1 through 7, run `npm test`, and execute local cURL requests against `docker-compose up`.
* **Day 3 (Core Business Logic):** Study files 8 through 13. Trace an incoming click through `urlRedirectionService` to `captureAnalytics` and understand how the Redis cache operates.
* **Day 5 (Testing & Contributions):** Study files 14 and 15. Pick a small task from the Improvement Roadmap (e.g., adding pagination or fixing `lastClickedAt`) and submit a pull request.

---

## 13. Build Order (Historical Construction Analysis)

Based on codebase structure, the system was constructed in the following phases:

1. **Phase 1: Project Skeleton & Configuration:** Initialized Express 5, ESLint, Prettier, and environment variable loading (`src/index.js`, `src/util/env.js`).
2. **Phase 2: Database Initialization:** Configured MongoDB Mongoose connection and ioredis client (`src/db/`).
3. **Phase 3: Base62 Generator & Core Models:** Built `Counter` and `shortURL` schemas, followed by `hashGenerator.js`.
4. **Phase 4: Link Shortening & Redirection Service:** Implemented `urlService.js`, `url.controller.js`, and `url.router.js`.
5. **Phase 5: In-Memory Caching & Rate Limiting:** Added Redis caching logic to `urlService.js` and rate-limiting middleware to `limiter.middleware.js`.
6. **Phase 6: Telemetry & Analytics Aggregation:** Integrated `geoip-lite` and `ua-parser-js` into `captureAnalytics`, followed by aggregation pipelines in `analyticService.js`.
7. **Phase 7: CSV Reporting & Load Testing:** Added `@json2csv/plainjs` export endpoint and created k6 load test scripts in `load/`.

---

## 14. Current State of Each Feature

| Feature ID | Feature Name | Status | Evidence in Code | Key Files |
| :--- | :--- | :--- | :--- | :--- |
| **F-1** | Atomic Base62 Short URL Generation | **Complete** | Atomic counter increment, BigInt Base62 encoding, persistence in MongoDB. | `src/service/urlService.js`, `src/util/hashGenerator.js` |
| **F-2** | Configurable URL Expiration (TTL) | **Complete** | Defaults to 30 days; MongoDB TTL index auto-evicts expired documents. | `src/service/urlService.js`, `src/model/url.model.js` |
| **F-3** | Sub-10ms Cached Redirection | **Complete** | Cached in Redis with dynamic TTL; returns HTTP 307 redirect. | `src/service/urlService.js`, `src/controller/url.controller.js` |
| **F-4** | Non-Blocking Click Telemetry Capture | **Complete** | Dispatched via unawaited promise; parses GeoIP and User-Agent. | `src/service/urlService.js`, `src/model/analysis.model.js` |
| **F-5** | Global Multi-Faceted Analytics Dashboard | **Complete** | Executes 8-way `$facet` aggregation pipeline across all active links. | `src/service/analyticService.js`, `src/controller/analysis.controller.js` |
| **F-6** | Single-Code Cached Analytics Breakdown | **Complete** | Two-tier Redis cache (`map:` and `stats:`) with 300s TTL. | `src/service/analyticService.js`, `src/controller/analysis.controller.js` |
| **F-7** | Hourly and Daily Trend Telemetry | **Complete** | Aggregates hourly and daily clicks; cached in Redis hash for 300s. | `src/service/analyticService.js`, `src/controller/analysis.controller.js` |
| **F-8** | CSV Analytics Report Export | **Complete** | Streams raw click logs as downloadable CSV files with rate limiting. | `src/service/analyticService.js`, `src/controller/analysis.controller.js` |
| **F-9** | Multi-Tier Redis Rate Limiting | **Complete** | Redis-backed rate limiting across 3 tiers (50/min, 100/min, 5/15min). | `src/middleware/limiter.middleware.js` |
| **F-10** | Active URL Listing | **Partial** | Functional endpoint, but lacks pagination and references dead `lastClickedAt` field. | `src/controller/urlList.controller.js` |
| **F-11** | Email Dispatch System | **Broken / Unused** | Model defined, packages installed, but zero service logic exists. | `src/model/emailservice.model.js`, `package.json` |
| **F-12** | User Management & Auth | **Scaffolded** | Commented validation schemas; `generatedBy: User` reference with no model. | `src/util/validation.js`, `src/model/url.model.js` |

---

## 15. Technical Debt and Known Issues

| Issue Description | Source File Reference | Why It Matters | Effort |
| :--- | :--- | :--- | :--- |
| **Dead Field Projection (`lastClickedAt`)** | `src/controller/urlList.controller.js` (line 8) | Selected and returned as `null` on all records; confusing to API consumers. | **Small** |
| **Layering Violation in URL Listing** | `src/controller/urlList.controller.js` (lines 6–10) | Controller queries Mongoose model directly rather than delegating to service. | **Small** |
| **Hardcoded Timezone in Analytics** | `src/service/analyticService.js` (lines 191, 199) | Hardcodes `+05:30` IST offset, producing inaccurate hourly charts for non-Indian users. | **Small** |
| **Un-Cached Global Analytics Dashboard** | `src/service/analyticService.js` (line 10) | Heavy MongoDB aggregation executes on every request without caching. | **Medium** |
| **Unprotected Administrative Endpoints** | `src/route/analysis.router.js` | Analytics dashboards and CSV exports are public without authentication. | **Medium** |
| **Uncollected Orphaned Analytics Records**| `src/model/analysis.model.js` | Clicks remain stored indefinitely after parent short URLs expire or are deleted. | **Medium** |
| **Fire-and-Forget Promise Telemetry** | `src/service/urlService.js` (line 106) | Unawaited promises in the event loop can be lost during container restarts. | **Large** |
| **Unused Scaffolded Packages** | `package.json`, `src/model/emailservice.model.js` | `resend`, `nodemailer`, and `emailservice.model.js` add unnecessary bloat. | **Small** |

---

## 16. Security and Quality Checklist

* [x] **Rate Limiting (Done):** Enforced across all endpoints via Redis key stores (`src/middleware/limiter.middleware.js`).
* [x] **Security Headers (Done):** Protective HTTP headers injected via `helmet()` (`src/index.js`).
* [x] **CORS Configuration (Done):** Restricted to `ENV.CLIENT_URL` with credentials allowed (`src/index.js`).
* [x] **Input Sanitization (Done):** Short codes restricted to strict alphanumeric characters via Zod regex (`src/util/validation.js`).
* [ ] **Route Authentication (Missing):** No authentication gates protect administrative or analytics endpoints.
* [ ] **PII Protection (Missing):** Raw IP addresses are stored directly in MongoDB without masking or hashing.
* [ ] **Non-Root Container Execution (Missing):** The `Dockerfile` runs as root rather than switching to `USER node`.
* [ ] **Automated Backups (Missing):** No automated database backup or point-in-time recovery workflows exist in the repository.

---

## 17. Improvement Roadmap

### Prioritized Improvement Phases

#### Phase 1: Immediate Security & Bug Fixes (Now)
1. **Fix `lastClickedAt` Dead Field:** Add `lastClickedAt: { type: Date }` to `src/model/url.model.js` and update it inside `captureAnalytics` during click processing.  
   * *Effort:* Small | *Risk:* Low | *Files:* `src/model/url.model.js`, `src/service/urlService.js`
2. **Fix Layering Violation in URL Listing:** Move the query from `src/controller/urlList.controller.js` into `src/service/urlService.js`.  
   * *Effort:* Small | *Risk:* Low | *Files:* `src/controller/urlList.controller.js`, `src/service/urlService.js`
3. **Cache Global Analytics Dashboard in Redis:** Add a 5-minute Redis cache (`stats:global`) to `getAllDetailsService` in `src/service/analyticService.js`.  
   * *Effort:* Small | *Risk:* Low | *Files:* `src/service/analyticService.js`
4. **Remove Unused Dependencies:** Remove `nodemailer`, `resend`, and delete `src/model/emailservice.model.js`.  
   * *Effort:* Small | *Risk:* Low | *Files:* `package.json`, `src/model/emailservice.model.js`

#### Phase 2: Core Enhancements & Test Coverage (Next)
5. **Add Pagination to Active Link Listing:** Add `page` and `limit` query parameters to `GET /api/v1/url/` with sensible defaults (e.g., 20 items per page).  
   * *Effort:* Medium | *Risk:* Low | *Files:* `src/controller/urlList.controller.js`, `src/service/urlService.js`
6. **Support Dynamic Timezones in Analytics:** Accept an optional `timezone` query parameter in `GET /api/v1/analysis/:shortCode/trend` (defaulting to UTC).  
   * *Effort:* Small | *Risk:* Low | *Files:* `src/service/analyticService.js`
7. **Add Automated Integration Tests for URL Listing:** Write integration tests in `tests/integration/url.test.js` to cover `GET /api/v1/url/`.  
   * *Effort:* Small | *Risk:* Low | *Files:* `tests/integration/url.test.js`
8. **Anonymize Client IP Addresses (GDPR Compliance):** Mask the final octet of IPv4 addresses prior to database storage in `captureAnalytics`.  
   * *Effort:* Small | *Risk:* Medium | *Files:* `src/service/urlService.js`

#### Phase 3: Architectural Scaling & Enterprise Features (Later)
9. **Implement Durable Queue for Telemetry Ingestion:** Introduce BullMQ backed by Redis to buffer click telemetry events before writing them to MongoDB.  
   * *Effort:* Large | *Risk:* Medium | *Files:* `src/service/urlService.js`, `package.json`
10. **Implement User Authentication & API Keys:** Build user registration/login using `bcrypt` and `jsonwebtoken`, and enforce link ownership via `shortURL.generatedBy`.  
    * *Effort:* Large | *Risk:* Medium | *Files:* `src/model/user.model.js`, `src/route/auth.router.js`, `src/middleware/auth.middleware.js`
11. **Implement Automated Cleanup for Orphaned Analytics:** Add a Mongoose pre-remove hook or scheduled cron job to delete analytics records when parent links expire.  
    * *Effort:* Medium | *Risk:* Low | *Files:* `src/model/url.model.js`

### Quick Wins (Tasks Achievable in Under 4 Hours)
* [ ] Fix the `lastClickedAt` projection in `urlList.controller.js`.
* [ ] Move the database query out of `urlList.controller.js` into `urlService.js`.
* [ ] Add a 300-second Redis cache to the global analytics dashboard (`getAllDetailsService`).
* [ ] Add `USER node` directive to `Dockerfile` for non-root container security.

---

## 18. New Feature Planning Template

### Blank Feature Planning Template
```markdown
### Feature Specification: [Feature Name]
* **Feature ID:** F-[X]
* **Goal & Purpose:** [Why are we building this?]
* **Target Users:** [Who will use this feature?]
* **Data Layer Changes:**
  * New Entities / Collections: [None / Name]
  * Field Additions / Index Updates: [Details]
* **API & Interface Changes:**
  * Endpoints Added / Modified: [Method + Path]
  * Request / Response Payloads: [JSON Shapes]
* **Caching & Performance Impact:** [Redis keys affected, TTLs]
* **Security & Validation Rules:** [Zod schemas, Rate limiters, Auth requirements]
* **Testing Plan:** [Unit test files and Integration test assertions]
* **Rollout Risks & Mitigation:** [Identified risks and mitigation plan]
```

### Worked Example: Custom Short URL Alias (F-13)
* **Feature ID:** F-13
* **Goal & Purpose:** Allow users to specify a custom short code (e.g., `http://localhost:5000/my-brand`) instead of an auto-generated Base62 string.
* **Target Users:** Marketers and campaign creators.
* **Data Layer Changes:**
  * Add `customAlias: { type: String, sparse: true, unique: true }` to `src/model/url.model.js`.
* **API & Interface Changes:**
  * Modify `POST /api/v1/url/` request body to accept optional `"customAlias": "my-brand"`.
* **Caching & Performance Impact:**
  * Cached in Redis using standard `url:<customAlias>` pattern with dynamic TTL.
* **Security & Validation Rules:**
  * Validate custom alias using Zod: minimum 3 characters, maximum 30 characters, alphanumeric with hyphens (`/^[a-zA-Z0-9-_]+$/`). Prevent reserved paths (`api`, `docs`, `health`).
* **Testing Plan:**
  * Add unit test in `validation.test.js` checking alias syntax.
  * Add integration test in `url.test.js` ensuring unique alias creation and rejecting duplicates with `409 Conflict`.
* **Rollout Risks & Mitigation:**
  * *Risk:* Collisions with system route prefixes (e.g., `/api`).
  * *Mitigation:* Maintain a reserved keyword blacklist in `src/util/validation.js`.

---

## 19. Instructions for AI Coding Tools

When generating or modifying code in this repository, follow these rules:

1. **Folder Placement Rules:**
   * Route registrations $\rightarrow$ `src/route/<resource>.router.js`
   * HTTP handlers $\rightarrow$ `src/controller/<resource>.controller.js`
   * Business logic & queries $\rightarrow$ `src/service/<resource>Service.js`
   * Database schemas $\rightarrow$ `src/model/<resource>.model.js`
   * Helpers & validators $\rightarrow$ `src/util/<utility>.js`
2. **Formatting Standards:**
   * **Never use semicolons** at the ends of lines.
   * Use **single quotes** for strings (`'hello'`).
   * Use **2 spaces** for indentation.
3. **Error Handling & Async Patterns:**
   * Never write raw `try/catch` blocks inside controllers. Wrap all controllers in `asyncHandler`.
   * Always throw `AppError` instances with explicit `StatusCodes` from `http-status-codes`.
   * Wrap successful JSON responses inside `new ApiResponse(statusCode, message, data)`.
4. **Data Access Rules:**
   * Never query Mongoose models directly inside controllers; all queries must live in `src/service/`.
   * When reading MongoDB data for exports or read-only pipelines, always append `.lean()`.
5. **Testing Verification:**
   * Always run `npm test` after implementing changes to ensure in-memory test suites remain 100% green.
   * Run `npm run lint` and `npm run format` prior to finalizing changes.

---

## 20. Interview and Explanation Guide

### 2-Minute Spoken Walkthrough (Codebase Quality Edition)
> "The codebase is organized as a layered Node.js and Express REST microservice using modern ES Modules.
>
> We separate concerns cleanly: routes define paths and apply Redis rate limiters, controllers extract HTTP parameters and format responses using a standardized `ApiResponse` class, and services contain all business logic and database interactions.
>
> Operational errors are managed through a custom `AppError` class that bubbles up to a centralized error interceptor, keeping controllers clean through an `asyncHandler` wrapper.
>
> We use ESLint and Prettier to enforce consistent code style—strictly omitting semicolons and using single quotes. For testing, we use Jest backed by in-memory MongoDB and Redis servers, allowing complete integration testing without external dependencies.
>
> In terms of improvements, there are three key areas I would address: First, fixing the layer violation in `urlList.controller.js` where the controller queries Mongoose directly. Second, adding pagination to the link listing endpoint. Third, introducing a durable queue like BullMQ for telemetry writes, replacing the current unawaited promise pattern to ensure zero event loss under heavy traffic."

---

### 20 Technical Interview Questions & Answers

#### 1. Why does the codebase omit semicolons?
* **Answer:** Semicolon omission is enforced across the codebase by `.prettierrc` (`"semi": false`) and ESLint. JavaScript's Automatic Semicolon Insertion (ASI) handles statement termination cleanly under standard formatting rules.

#### 2. What is the purpose of `asyncHandler.js`?
* **Answer:** It is a higher-order function that wraps asynchronous Express controllers in `Promise.resolve(fn(req, res, next)).catch(next)`. This eliminates repetitive `try/catch` boilerplate in controllers by automatically forwarding rejected promises to the global error middleware. *(File: `src/util/asyncHandler.js`)*

#### 3. Where does the code violate its own layering architecture?
* **Answer:** In `src/controller/urlList.controller.js`, where the controller directly imports and queries `shortURL` from `src/model/url.model.js` instead of delegating the query to `src/service/urlService.js`.

#### 4. How does the testing environment run without live MongoDB and Redis instances?
* **Answer:** The test harness in `tests/setup.js` uses `mongodb-memory-server` and `redis-memory-server` to spin up ephemeral, in-memory database instances during test runs.

#### 5. Why is `BigInt` used in `hashGenerator.js`?
* **Answer:** Standard JavaScript numbers lose precision above $2^{53} - 1$ (`Number.MAX_SAFE_INTEGER`). Using `BigInt` ensures the Base62 encoder performs accurate modulo and division arithmetic even if the sequence counter grows extremely large. *(File: `src/util/hashGenerator.js`)*

#### 6. What is the issue with the `lastClickedAt` field in `urlList.controller.js`?
* **Answer:** *Honest Answer:* It is dead code. The controller selects and returns `lastClickedAt`, but the field is never defined in `url.model.js` and never populated during click tracking, causing it to return `null` on all records.

#### 7. How does the service handle Redis connectivity drops during redirects?
* **Answer:** The Redis lookup in `urlRedirectionService` is wrapped in a `try/catch` block. If Redis fails, it logs an error via Pino and falls back to querying MongoDB directly, keeping redirects functional. *(File: `src/service/urlService.js`)*

#### 8. What is the risk of using unawaited promises for background analytics?
* **Answer:** *Honest Answer:* If the Node.js container restarts or crashes while an unawaited promise is pending in the event loop, that analytics event is lost. A production system under high volume should buffer events through a durable queue like BullMQ. *(File: `src/service/urlService.js`)*

#### 9. Why does `exportAnalyticsCSV` use `.lean()`?
* **Answer:** Calling `.lean()` instructs Mongoose to return plain JavaScript objects instead of full Mongoose documents, reducing memory consumption and improving serialization performance when parsing large CSV exports. *(File: `src/service/analyticService.js`)*

#### 10. How are rate limiters distributed across multiple server replicas?
* **Answer:** The rate limiters use `rate-limit-redis` as their storage backend. All container instances share the same Redis instance, ensuring client IP request counts are tracked consistently across the cluster. *(File: `src/middleware/limiter.middleware.js`)*

#### 11. What timezone issue exists in the trend analytics aggregation?
* **Answer:** `src/service/analyticService.js` hardcodes the timezone offset to Indian Standard Time (`+05:30`), producing skewed hourly metrics for users in other timezones. It should accept dynamic timezone parameters from client requests.

#### 12. Why are `resend` and `nodemailer` installed if they are not used?
* **Answer:** *Honest Answer:* They represent unfinished scaffolding. The dependencies and `emailservice.model.js` were installed for an email notification feature that was never completed. They should be removed to reduce dependency footprint.

#### 13. How does the system automatically remove expired links?
* **Answer:** The `shortURL` schema defines a TTL index: `expiresAt: { type: Date, index: { expires: 0 } }`. MongoDB's background worker thread monitors this index and automatically removes expired documents without requiring manual cron jobs. *(File: `src/model/url.model.js`)*

#### 14. What happens if a client requests an invalid short code with special characters?
* **Answer:** `validShortCode` in `src/util/validation.js` checks the code against regex `/^[a-zA-Z0-9]+$/` and throws an `AppError` with status `406 Not Acceptable`.

#### 15. How are environment variables validated across different operating systems?
* **Answer:** NPM scripts use `cross-env` (`package.json`) to set `NODE_ENV` consistently across Windows, macOS, and Linux environments.

#### 16. Why does the application configure `trust proxy` in `src/index.js`?
* **Answer:** Running behind reverse proxies or load balancers masks client IP addresses behind the proxy's IP. Configuring `app.set('trust proxy', 1)` instructs Express to read the client IP from the `X-Forwarded-For` header.

#### 17. What security gap exists on the analytics endpoints?
* **Answer:** *Honest Answer:* All `/api/v1/analysis/*` endpoints are publicly accessible without authentication, allowing anyone to view global metrics and download telemetry CSVs. JWT or API key authentication must be added.

#### 18. How would you refactor `urlRedirectionService` to improve testability?
* **Answer:** Currently, `urlRedirectionService` accepts Express's native `req` object. It should be refactored to accept a plain DTO (`{ shortCode, ip, userAgent, referrer }`), decoupling the business service from the HTTP framework.

#### 19. What would you do first if tasked with improving this codebase?
* **Answer:** I would start with the quick wins: remove unused email dependencies, fix the layering violation in `urlList.controller.js`, add a 5-minute Redis cache to the global analytics dashboard, and implement pagination on the link listing endpoint.

#### 20. How does the system handle database connection drops on startup?
* **Answer:** In `src/index.js`, `connectDB()` is wrapped in a `try/catch` block. If connection fails, the error is logged via Pino and the process terminates immediately with `process.exit(1)`.

---

## 21. Glossary

* **Linting:** Static analysis of source code to flag syntax errors, code smells, and style violations without executing the code.
* **Refactoring:** Restructuring existing source code without altering its external behavior to improve readability, maintainability, and architectural cleanliness.
* **Technical Debt:** The implied cost of future rework caused by choosing an easy or expedient solution now instead of a better architectural approach.
* **Mocking:** Replacing a real software dependency (such as a database or third-party service) with a simulated object during automated testing.
* **Code Coverage:** A measurement indicating the percentage of source code executed while running automated test suites.
* **Conventional Commits:** A standardized specification for commit messages (e.g., `feat:`, `fix:`, `refactor:`) that facilitates automated changelog generation and clear version history.
* **In-Memory Database:** A database engine that stores data directly in system RAM rather than writing to disk, providing fast, isolated environments for automated tests.
* **Definition of Done (DoD):** An agreed-upon checklist of criteria that a software feature or bugfix must satisfy before it is considered production-ready.

---

## 22. Open Questions

1. **Email Service Scaffolding Cleanup:**  
   Can we safely remove `resend`, `nodemailer`, and `src/model/emailservice.model.js` from the repository, or is an email dispatch feature scheduled for near-term development?
2. **Adoption of Standard Git Workflow:**  
   Should the team establish standard GitHub PR templates, branch naming conventions, and automated GitHub Actions CI pipelines?
3. **Queue Technology for Telemetry:**  
   When scaling the background analytics engine, is BullMQ with Redis the preferred queue technology, or is an external message broker (such as AWS SQS or Kafka) preferred?
4. **Resolution of Dead Field `lastClickedAt`:**  
   Should we fully implement `lastClickedAt` by adding it to `url.model.js` and updating it during click capture, or remove it from `urlList.controller.js`?
5. **Pagination Standards:**  
   What default page size (e.g., 20 or 50) and parameter naming (`page`/`limit` vs. `offset`/`limit`) should be adopted for link and report listing endpoints?
