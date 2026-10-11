# Tech Stack & Dependencies: URL Shortener & Analytics System

**Document Version:** 1.0.0  
**Project Name:** `url_shortner`  
**System Type:** Backend RESTful Microservice  
**Target Audience:** Software Engineers, DevOps Engineers, Technical Interviewers, and Engineering Managers  
**Companion Documents:**  
* Document 1: `docs/project_requirement_description.md` (PRD)  
* Document 2: `docs/architecture_overview.md` (Architecture Overview)

---

## 1. Tech Stack Summary

### Plain-Language Summary
This application is a backend-only REST service written in modern JavaScript (ECMAScript 2022) running on the Node.js 22 runtime with native ES Modules (`"type": "module"`). It uses Express.js version 5 as its web server framework to expose HTTP APIs. The data architecture is powered by two engines: MongoDB (managed via Mongoose 9) as the persistent document store for links and telemetry logs, and Redis (interfaced through `ioredis` 5) as an in-memory cache for high-speed redirects and distributed rate limiting. Analytics enrichment runs completely locally using offline databases for IP geolocation (`geoip-lite`) and hardware User-Agent parsing (`ua-parser-js`). The application is containerized with Docker on Debian Linux (`node:22-slim`) and orchestrated using Docker Compose.

### 30-Second Spoken Pitch (Tech Stack Edition)
> "Our stack is built on Node.js 22 and Express 5 using pure ES Modules. For data storage, we combine MongoDB and Mongoose for schema-backed document persistence and TTL link auto-expiration, alongside Redis and ioredis for sub-millisecond cached redirects and distributed rate limiting. For click intelligence, we deliberately avoid external network API calls—we parse IP geolocation using local binary databases with geoip-lite and parse client user-agents using ua-parser-js. The entire system is strictly validated with Zod, protected with Helmet and CORS, logged via Pino, fully containerized on node:22-slim, and tested with Jest using in-memory MongoDB and Redis test servers."

### Comprehensive Tech Stack Overview

| System Layer | Technology | Declared Version in `package.json` | Purpose in THIS Specific Project |
| :--- | :--- | :--- | :--- |
| **Runtime Environment** | Node.js | `^22.0.0` (Pinned to `node:22-slim` in Dockerfile) | Server-side JavaScript execution environment. |
| **Language Standard** | JavaScript (ES2022) | ES Modules (`"type": "module"`) | Native `import`/`export` syntax and modern language features (BigInt). |
| **Web Framework** | Express.js | `^5.2.1` | HTTP routing, request parsing, and middleware pipeline orchestration. |
| **Primary Database** | MongoDB | Latest (`mongo:latest` in Docker) | Persistent storage for URLs, atomic sequence counters, and raw click logs. |
| **Database Driver & ODM** | Mongoose | `^9.2.1` | Schema modeling, indexes, and aggregation pipelines. |
| **In-Memory Cache & Store**| Redis | Alpine (`redis:alpine` in Docker) | Cache-aside for redirects, stats hashes, and rate-limiting buckets. |
| **Redis Client** | ioredis | `^5.9.3` | High-performance Redis client with auto-reconnect backoff and LRU config. |
| **Rate Limiting** | express-rate-limit & rate-limit-redis | `^8.3.1` & `^4.3.1` | Distributed request throttling backed by Redis key stores. |
| **Local Geolocation Engine**| geoip-lite | `^1.4.10` | Offline IP lookup for city, region, and country without network latency. |
| **Client Device Parser** | ua-parser-js | `^2.0.9` | User-Agent string parsing for browser, OS, and hardware category. |
| **Data Export Tool** | @json2csv/plainjs | `^7.0.6` | Formats raw MongoDB analytics document arrays into downloadable CSV files. |
| **HTTP Security Headers** | Helmet | `^8.1.0` | Injects security headers (XSS filtering, MIME-sniffing defense, frameguard). |
| **Cross-Origin Security** | CORS | `^2.8.6` | Configures allowed origins, methods, and credentials for web clients. |
| **Structured Logging** | Pino | `^10.3.1` | Ultra-low overhead JSON logger for runtime diagnostics and errors. |
| **Schema Validation** | Zod | `^4.3.6` | Enforces URL formatting, short code patterns, and object ID validity. |
| **Testing Framework** | Jest & Supertest | `^30.3.0` & `^7.2.2` | Test runner, assertions, and HTTP endpoint integration test execution. |
| **In-Memory Test DBs** | mongodb-memory-server & redis-memory-server | `^11.0.1` & `^0.16.0` | Spins up ephemeral databases for fast, isolated test suites. |
| **Code Quality & Style** | ESLint & Prettier | `^9.39.2` & `^3.8.1` | Static analysis, linting rules, and automatic code formatting. |
| **Containerization** | Docker & Docker Compose | Dockerfile (Node 22-slim) | Reproducible multi-container runtime environment. |

---

## 2. Languages and Runtimes

### Primary Language & Runtime Specifications
* **Runtime:** **Node.js**
  * **Version Requirement:** Node.js 22 LTS (Active).
  * **Where Version is Pinned:** `Dockerfile` (`FROM node:22-slim`).
  * **Module System:** ECMAScript Modules (ESM). Declared via `"type": "module"` in `package.json` (line 11). All imports use native `import ... from ...` statements with explicit `.js` file extensions.
* **Language:** **JavaScript (ECMAScript 2022 / ES13)**
  * **Specification Level:** ES2022 is configured in `.eslintrc.js` (`env: { es2022: true }`).
  * **Key Language Features Utilized in Code:**
    * **`BigInt` Literals & Arithmetic:** Used in `src/util/hashGenerator.js` (`BigInt(num)`, `n > 0n`, `n / base`) to prevent integer overflow during Base62 encoding.
    * **Native `URL` Global API:** Used in `src/util/validation.js` (`new URL(url)`) for strict URL parsing and normalization.
    * **Async/Await & Unawaited Promise Dispatch:** Used extensively across `src/service/` for database interactions and background telemetry execution.
    * **Object Rest/Spread & Array Destructuring:** Used in controllers and aggregation formatting.

### Codebase Language Breakdown *(Estimated [INFERRED])*
* **JavaScript (`.js`):** **98%** (All application source code, configuration files, unit tests, integration tests, and k6 test suites).
* **YAML / Dockerfile:** **2%** (`docker-compose.yaml`, `Dockerfile`, configuration manifests).

---

## 3. Frontend Technologies

* **Status:** **No frontend exists in this repository.**
* **Architectural Explanation:** The repository is strictly a backend REST API. It serves JSON data and file streams to external consumers.
* **Client Integration Point:** Cross-Origin Resource Sharing is implemented in `src/index.js` using `cors`:
  ```javascript
  // src/index.js
  const corsOptions = {
    origin: ENV.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }
  app.use(cors(corsOptions))
  ```
  Any frontend (React, Next.js, Vue, mobile application) communicating with this service connects via `CLIENT_URL` and interacts over standard HTTP endpoints.

---

## 4. Backend Technologies

### Core Framework & Middleware
* **Express.js (`^5.2.1`):**  
  * **Role:** The application server and routing framework (`src/index.js`). Express 5 natively handles rejected promises in route handlers and middleware without crashing the process.
  * **File References:** `src/index.js`, `src/route/*.router.js`.
* **http-status-codes (`^2.3.0`):**  
  * **Role:** Standardizes HTTP status codes across the codebase (e.g., `StatusCodes.OK`, `StatusCodes.TEMPORARY_REDIRECT`, `StatusCodes.BAD_REQUEST`). Prevents hardcoded magic numbers in controllers.
  * **File References:** `src/controller/url.controller.js`, `src/controller/analysis.controller.js`, `src/util/ApiError.js`.
* **Helmet (`^8.1.0`):**  
  * **Role:** Secures Express apps by setting various HTTP response headers (Content-Security-Policy, X-Content-Type-Options, X-Frame-Options).
  * **File Reference:** `src/index.js` (line 21).
* **CORS (`^2.8.6`):**  
  * **Role:** Controls access from cross-origin domains based on the configured `CLIENT_URL`.
  * **File Reference:** `src/index.js` (lines 14–22).
* **cookie-parser (`^1.4.7`):**  
  * **Role:** Installed in `package.json`, intended for parsing HTTP cookies. Currently unused in `src/index.js`.
* **dotenv (`^17.3.1`):**  
  * **Role:** Loads environment variables from `.env` into `process.env`.
  * **File Reference:** `src/util/env.js`.

### Validation & Cryptography
* **Zod (`^4.3.6`):**  
  * **Role:** TypeScript-first schema declaration and data validation library. Used in `src/util/validation.js` to enforce string rules, minimum lengths, and regular expressions for short codes.
* **libphonenumber-js (`^1.12.36`):**  
  * **Role:** International phone number parsing and validation library. Present in `src/util/validation.js` inside the commented-out `validContactNo` helper.
* **bcrypt (`^6.0.0`):**  
  * **Role:** Password-hashing library installed in `package.json`. Scaffolded for user authentication; currently unused in active controllers.
* **jsonwebtoken (`^9.0.3`):**  
  * **Role:** JSON Web Token (JWT) signing and verification library installed in `package.json`. Scaffolded for user authentication; currently unused.

### Logging & Utilities
* **Pino (`^10.3.1`):**  
  * **Role:** Extremely fast, asynchronous JSON logger. Used to capture system events, Redis states, and unhandled exceptions.
  * **File References:** `src/util/logger.js`, `src/middleware/error.middleware.js`.
* **cross-env (`^10.1.0`):**  
  * **Role:** Sets environment variables across different operating systems (Windows, macOS, Linux) in `npm run` scripts.
  * **File Reference:** `package.json` (scripts: `dev`, `test`, `start`).

---

## 5. Database and Storage

### Primary Storage: MongoDB & Mongoose
* **Engine:** MongoDB (Document-oriented NoSQL database).
* **ODM / Driver:** `mongoose` version `^9.2.1`.
* **Connection File:** `src/db/connection.db.js`.
* **Architectural Purpose:**
  * Stores URL documents (`src/model/url.model.js`) with an automatic TTL expiration index: `{ expiresAt: { type: Date, index: { expires: 0 } } }`.
  * Stores click telemetry logs (`src/model/analysis.model.js`) with compound index: `{ shortUrlId: 1, clickDate: -1 }`.
  * Manages atomic sequence generation via `src/model/counter.model.js`.
* **Migrations:** No external migration tool (such as `migrate-mongo`) is used. Schema changes and indexes are applied at runtime by Mongoose upon connection.

### In-Memory Storage: Redis & ioredis
* **Engine:** Redis (Alpine Linux build in Docker).
* **Client Driver:** `ioredis` version `^5.9.3`.
* **Connection File:** `src/db/redisClient.js`.
* **Configuration:**
  * `maxmemory 256mb`: Caps Redis memory usage to 256 megabytes.
  * `maxmemory-policy allkeys-lru`: Automatically evicts the least recently used keys when memory reaches 256MB.
  * Retry Strategy: Exponential backoff with a 2000ms ceiling (`Math.min(times * 50, 2000)`).
* **Key Namespaces Used in Redis:**
  * `url:<shortCode>`: String key storing JSON `{ _id, url }` with dynamic TTL.
  * `map:<shortCode>`: String key mapping short code to MongoDB `_id` (TTL 3600s).
  * `stats:<_id>`: Redis Hash storing JSON-encoded facet statistics (TTL 300s).
  * `trend:<shortCode>`: String key mapping short code to `_id` (TTL 3600s).
  * `trend:<_id>`: Redis Hash storing hourly/daily trend counts (TTL 300s).
  * `rl-create:<ip>`, `rl-red:<ip>`, `rl-report:<ip>`: Rate limiting buckets.

---

## 6. Complete Dependency Table

### Runtime Dependencies (`dependencies` in `package.json`)

| Dependency Name | Declared Version | Category | Purpose in This Project | Main File Where Used | Associated Feature IDs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`@json2csv/plainjs`** | `^7.0.6` | Data Serialization | Converts raw MongoDB analytics document arrays into standard CSV text files. | `src/service/analyticService.js` | F-8 |
| **`bcrypt`** | `^6.0.0` | Cryptography | Scaffolded for password hashing. Unused in active endpoints. | `package.json` | F-12 (Inactive) |
| **`cookie-parser`** | `^1.4.7` | HTTP Middleware | Scaffolded for HTTP cookie header parsing. Unused in active routes. | `package.json` | F-12 (Inactive) |
| **`cors`** | `^2.8.6` | Security | Whitelists allowed origin domains (`CLIENT_URL`) and HTTP verbs. | `src/index.js` | All Features |
| **`cross-env`** | `^10.1.0` | CLI Utility | Sets `NODE_ENV` across Windows and POSIX operating systems in npm scripts. | `package.json` | All Features |
| **`dotenv`** | `^17.3.1` | Configuration | Reads `.env` key-value pairs into `process.env`. | `src/util/env.js` | All Features |
| **`express`** | `^5.2.1` | Web Framework | Core web application router, middleware pipeline, and HTTP server. | `src/index.js` | All Features |
| **`express-rate-limit`**| `^8.3.1` | Defensive Security | Intercepts excessive HTTP calls and issues 429 status responses. | `src/middleware/limiter.middleware.js` | F-9 |
| **`geoip-lite`** | `^1.4.10` | Geolocation | In-memory IP-to-city/country/region lookup without external API latency. | `src/service/urlService.js` | F-4 |
| **`helmet`** | `^8.1.0` | Defensive Security | Sets standard protective HTTP response headers. | `src/index.js` | All Features |
| **`http-status-codes`** | `^2.3.0` | Utility | Provides named constants for numeric HTTP status codes (200, 307, 404, etc.). | `src/util/ApiError.js`, Controllers | All Features |
| **`ioredis`** | `^5.9.3` | Database Driver | High-throughput Redis client for caching and rate limiting. | `src/db/redisClient.js` | F-3, F-6, F-7, F-9 |
| **`jsonwebtoken`** | `^9.0.3` | Authentication | Scaffolded for JSON Web Token generation. Unused in active routes. | `package.json` | F-12 (Inactive) |
| **`libphonenumber-js`** | `^1.12.36` | Validation | Validates international phone numbers. Present in commented-out validation logic. | `src/util/validation.js` | F-12 (Inactive) |
| **`mongoose`** | `^9.2.1` | Database Driver / ODM | Schema validation, MongoDB document storage, and analytical aggregation pipelines. | `src/db/connection.db.js`, Models | All Features |
| **`nodemailer`** | `^8.0.1` | Email Dispatch | Scaffolded for SMTP email transmission. Unused in active services. | `package.json`, `emailservice.model.js` | F-11 (Inactive) |
| **`pino`** | `^10.3.1` | Logging | Fast, structured JSON logger for errors and lifecycle events. | `src/util/logger.js` | All Features |
| **`rate-limit-redis`** | `^4.3.1` | Cache Store Adapter | Connects `express-rate-limit` to Redis for shared, multi-instance rate limits. | `src/middleware/limiter.middleware.js` | F-9 |
| **`resend`** | `^6.9.2` | Email SDK | Scaffolded API client for the Resend transactional email platform. Unused in code. | `package.json` | F-11 (Inactive) |
| **`ua-parser-js`** | `^2.0.9` | User-Agent Parser | Extracts browser, operating system, and hardware device category from headers. | `src/service/urlService.js` | F-4 |
| **`zod`** | `^4.3.6` | Data Validation | Validates short code strings (`min(4)`, alphanumeric regex). | `src/util/validation.js` | F-1, F-3, F-6, F-7 |

---

### Development Dependencies (`devDependencies` in `package.json`)

| Dependency Name | Declared Version | Category | Purpose in This Project | Configuration File |
| :--- | :--- | :--- | :--- | :--- |
| **`@babel/core`** | `^7.29.0` | Transpiler Core | Core Babel engine for transforming modern ES module syntax during Jest test execution. | `babel.config.js` |
| **`@babel/preset-env`** | `^7.29.0` | Transpiler Preset | Automatically determines Babel polyfills and plugins for current Node.js target. | `babel.config.js` |
| **`babel-jest`** | `^30.2.0` | Test Transpiler | Transpiles ESM JavaScript code on the fly within Jest test suites. | `jest.config.js` |
| **`eslint`** | `^9.39.2` | Linter | Static code analysis tool identifying code smells, unused variables, and errors. | `.eslintrc.js` |
| **`eslint-config-prettier`** | `^10.1.8` | Linter Config | Disables ESLint formatting rules that conflict with Prettier. | `.eslintrc.js` |
| **`eslint-plugin-import`** | `^2.32.0` | Linter Plugin | Enforces consistent ES module import/export standards. | `.eslintrc.js` |
| **`eslint-plugin-node`** | `^11.1.0` | Linter Plugin | Enforces Node.js best practices and module resolution checks. | `.eslintrc.js` |
| **`eslint-plugin-prettier`** | `^5.5.5` | Linter Plugin | Runs Prettier as an ESLint rule, reporting formatting mismatches as lint errors. | `.eslintrc.js` |
| **`jest`** | `^30.3.0` | Test Runner | Test execution engine, assertion library, and code coverage reporter. | `jest.config.js` |
| **`mongodb-memory-server`**| `^11.0.1` | Testing Database | Spins up an isolated, temporary in-memory MongoDB daemon during automated tests. | `tests/setup.js` |
| **`prettier`** | `^3.8.1` | Code Formatter | Opinionated code formatter enforcing consistent indentation, quotes, and spacing. | `.prettierrc` |
| **`redis-memory-server`** | `^0.16.0` | Testing Database | Spins up an isolated, temporary in-memory Redis instance during automated tests. | `tests/setup.js` |
| **`supertest`** | `^7.2.2` | HTTP Test Client | High-level HTTP testing abstraction for making mock requests to the Express app. | `tests/integration/*.test.js` |

---

## 7. Deep Dive: The 10 Most Important Technologies

### 1. Express.js (v5.2.1)
* **What it is:** The standard, minimalist web framework for Node.js.
* **The Problem It Solves:** Node's built-in `http` module requires manually parsing URLs, reading data chunks, handling query strings, and writing response headers. Express provides structured routing, middleware chaining, and unified request/response objects.
* **How This Project Uses It:** `src/index.js` creates the Express application, mounts body parsers, registers three routers (`urlRouter`, `redirectionRouter`, `analysisRouter`), and mounts a global error-handling middleware.
* **What Would Break Without It:** The application would have no HTTP routing, middleware pipeline, or endpoint handling.
* **Main Alternatives:** Fastify (faster, schema-based serialization), NestJS (opinionated enterprise TypeScript framework), Koa (lighter middleware-only framework). Express was chosen for its wide adoption and simplicity.

---

### 2. MongoDB & Mongoose (v9.2.1)
* **What it is:** A NoSQL document database paired with an Object Data Modeling (ODM) library for Node.js.
* **The Problem It Solves:** Relational databases (like PostgreSQL) require strict pre-defined column schemas and relational joins. MongoDB stores flexible, JSON-like BSON documents. Mongoose adds schema validation, casting, middleware hooks, and typed models.
* **How This Project Uses It:** 
  * Atomic counter sequence generation (`Counter.findOneAndUpdate` in `src/service/urlService.js`).
  * Storing short links with automatic TTL expiration via MongoDB's TTL index (`src/model/url.model.js`).
  * Running faceted aggregation pipelines to compute multi-dimensional click summaries in a single query (`src/service/analyticService.js`).
* **What Would Break Without It:** All persistent storage for links, sequence counters, and click telemetry would be lost.
* **Main Alternatives:** PostgreSQL with Prisma/Drizzle (relational, ACID-compliant transactions), DynamoDB (AWS-managed NoSQL). MongoDB was selected for its native JSON handling, flexible schema evolution, and built-in TTL indexes.

---

### 3. Redis & ioredis (v5.9.3)
* **What it is:** An ultra-fast, in-memory key-value data structure store paired with a robust Node.js client.
* **The Problem It Solves:** Reading from disk or querying MongoDB on every short link click takes 10–50ms and can overwhelm database connection pools under burst traffic. Redis serves cached entries from RAM in under 2ms.
* **How This Project Uses It:**
  * Caches destination URLs (`url:<shortCode>`) with a dynamic TTL matching the link's remaining lifespan.
  * Caches aggregated analytics in Redis Hashes (`stats:<id>`, `trend:<id>`) with 300-second TTLs.
  * Serves as the shared storage backend for distributed rate limiters.
  * Enforces an in-memory cap of 256MB with an LRU eviction policy (`src/db/redisClient.js`).
* **What Would Break Without It:** Redirect response times would degrade by 5–10x under high concurrency, rate limits would not be shared across multi-container instances, and MongoDB would experience direct query load on every click.
* **Main Alternatives:** Memcached (pure key-value, lacks hash data structures and disk persistence options), Dragonfly (modern multi-threaded Redis drop-in).

---

### 4. Base62 Algorithm & Native BigInt
* **What it is:** A mathematical positional numbering system using 62 alphanumeric characters (`0-9`, `a-z`, `A-Z`) combined with JavaScript's native arbitrary-precision integer primitive.
* **The Problem It Solves:** Random string generation risks hash collisions as databases grow, requiring expensive database retry checks. Standard integer encoding using JavaScript `Number` loses precision beyond $2^{53} - 1$ (`Number.MAX_SAFE_INTEGER`), which can corrupt generated codes at scale.
* **How This Project Uses It:** In `src/util/hashGenerator.js`, `encodeBase62` accepts the integer from MongoDB's atomic counter, casts it to `BigInt`, and applies repeated division and modulo by `62n` to produce a short alphanumeric code (e.g., counter `1030535323` encodes to `"17K1jt"`).
* **What Would Break Without It:** Short URLs would either risk duplicate collisions (if using random strings) or suffer character corruption when sequence counters exceed JavaScript's safe integer limit.
* **Main Alternatives:** UUID v4 (too long for short links: 36 characters), NanoID (random character generation, collision risk at massive scale), MurmurHash / MD5 (produces longer hashes and carries collision probabilities).

---

### 5. geoip-lite (v1.4.10)
* **What it is:** An in-memory, local IP-address-to-geolocation lookup library containing a compressed binary MaxMind database.
* **The Problem It Solves:** External geolocation APIs (like ipinfo.io or MaxMind web services) introduce external network latency (50–200ms per click), impose rate limits, and incur monthly API subscription costs.
* **How This Project Uses It:** In `src/service/urlService.js` (`captureAnalytics`), `geoip.lookup(ip)` resolves the visitor's city, region, and country in microseconds directly from local server memory.
* **What Would Break Without It:** The system could not extract geographic click metrics without querying an external API on every link redirect.
* **Main Alternatives:** MaxMind GeoIP2 Web API (external network latency, ongoing API cost), ip-api.com (free tier rate-limited to 45 req/min), ipdata.co.

---

### 6. ua-parser-js (v2.0.9)
* **What it is:** A regular-expression-based User-Agent string parsing library for JavaScript.
* **The Problem It Solves:** HTTP `User-Agent` headers are long, unstructured strings that vary across browser versions, operating systems, and device manufacturers.
* **How This Project Uses It:** In `src/service/urlService.js` (`captureAnalytics`), `new UAParser(userAgent).getResult()` categorizes client traffic into hardware type (`Desktop`, `Mobile`, `Tablet`), browser name, and operating system name.
* **What Would Break Without It:** Device, browser, and OS breakdowns in the analytics dashboards would receive raw User-Agent strings rather than structured categories.
* **Main Alternatives:** `useragent` (older, slower regex set), `woothee` (multi-language parser, less frequent updates).

---

### 7. @json2csv/plainjs (v7.0.6)
* **What it is:** A lightweight JavaScript library that converts arrays of JSON objects into standard CSV text.
* **The Problem It Solves:** Analysts and marketing managers often need raw click logs in spreadsheet formats (Excel, Google Sheets) rather than raw JSON payloads.
* **How This Project Uses It:** In `src/service/analyticService.js` (`exportAnalyticsCSV`), it flattens lean MongoDB analytics documents into comma-separated text, which is streamed as an attachment named `report-<shortCode>.csv`.
* **What Would Break Without It:** The CSV report download endpoint (`GET /api/v1/analysis/:shortCode/generateReport`) would fail.
* **Main Alternatives:** `csv-writer` (writes to physical disk files rather than in-memory strings), `fast-csv` (streaming-focused, heavier setup).

---

### 8. express-rate-limit & rate-limit-redis
* **What it is:** An Express rate-limiting middleware that connects to Redis using an adapter library.
* **The Problem It Solves:** Without rate limiting, malicious users or malfunctioning scripts could generate millions of short links, download heavy CSV reports repeatedly, or overwhelm the redirect service. Standard in-memory rate limiters track counts per process, making them ineffective across multiple container replicas.
* **How This Project Uses It:** In `src/middleware/limiter.middleware.js`, it enforces three distinct Redis-backed limits:
  1. `rl-create:`: 50 link creations per minute per IP.
  2. `rl-red:`: 100 redirects and dashboard queries per minute per IP.
  3. `rl-report:`: 5 CSV report exports per 15 minutes per IP.
* **What Would Break Without It:** The API would have no defense against denial-of-service traffic or brute-force scraping.
* **Main Alternatives:** Cloudflare / AWS WAF rate limiting (infrastructure level, costs money), custom Redis token-bucket implementation.

---

### 9. Helmet (v8.1.0) & CORS (v2.8.6)
* **What it is:** Essential security middleware packages for Node.js web applications.
* **The Problem It Solves:** Default Express configurations leak identifying server headers (`X-Powered-By: Express`), allow cross-origin script injection, and do not enforce frame boundaries.
* **How This Project Uses It:** `src/index.js` mounts `helmet()` to set secure HTTP headers and configures `cors(corsOptions)` to whitelist incoming requests based on `ENV.CLIENT_URL`.
* **What Would Break Without It:** The API would fail basic automated penetration tests and would not allow credentialed requests from an external frontend.
* **Main Alternatives:** Custom reverse-proxy headers configured in Nginx or an AWS Application Load Balancer.

---

### 10. Pino (v10.3.1)
* **What it is:** An extremely fast JSON logger for Node.js that minimizes runtime performance overhead.
* **The Problem It Solves:** Standard `console.log()` statements block the single-threaded Node.js event loop during high I/O operations and produce unstructured string outputs that are difficult to parse in log aggregators (like Datadog or ELK).
* **How This Project Uses It:** `src/util/logger.js` initializes Pino. Used throughout services and middleware to log connection events, Redis eviction warnings, and errors with full stack traces.
* **What Would Break Without It:** Structured logging would be absent, and high-frequency error logging could degrade event-loop performance.
* **Main Alternatives:** Winston (highly configurable, but slower), Morgan (specialized only for HTTP request logging, not application services).

---

## 8. Why These Technologies Were Chosen

| Technology Choice | Primary Selection Reason *[INFERRED]* | Alternatives Considered | Trade-Offs (What We Gain vs. What We Give Up) |
| :--- | :--- | :--- | :--- |
| **MongoDB + Mongoose** | Native JSON document model, flexible schema evolution, and built-in TTL document auto-deletion. | PostgreSQL, MySQL, CockroachDB | **Gain:** Fast document insertion, no rigid migrations, built-in TTL cleanup.<br>**Give Up:** ACID-compliant multi-table transactions, relational foreign key constraints. |
| **Redis Cache-Aside** | High throughput and sub-millisecond in-memory lookups. | Memcached, local Node.js memory maps | **Gain:** Shared state across container replicas, rich hash structures.<br>**Give Up:** Additional infrastructure to manage; cache invalidation complexity. |
| **Atomic Counter + Base62** | Guarantees collision-free short codes with deterministic length growth. | UUID v4, Random Strings, MD5 | **Gain:** Compact codes, zero collision retry checks.<br>**Give Up:** Sequential codes can be predictable if not offset or shuffled. |
| **Local geoip-lite** | Microsecond geolocation lookups with zero network calls and no API costs. | MaxMind API, ipinfo.io, ipdata | **Gain:** Fast lookups, no API rate limits or fees.<br>**Give Up:** Local binary database updates must be maintained manually. |
| **Pino Logger** | Low CPU overhead and structured JSON output. | Winston, Bunyan, console.log | **Gain:** Minimal event-loop blocking under high traffic.<br>**Give Up:** Fewer out-of-the-box transport plugins compared to Winston. |

---

## 9. Development Tools

### Tooling Configuration Table

| Tool | Category | Version | Configuration File | Purpose & Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **npm** | Package Manager | Bundled with Node 22 | `package.json`, `package-lock.json` | Dependency installation, lockfile resolution, and script management. |
| **ESLint** | Static Linter | `^9.39.2` | `.eslintrc.js` | Enforces ES2022 standards, unused variable warnings (`argsIgnorePattern: '^_'`), and module import hygiene. |
| **Prettier** | Code Formatter | `^3.8.1` | `.prettierrc` | Enforces code formatting: 2-space indentation, no semicolons (`"semi": false`), single quotes (`"singleQuote": true`), and 100-character print width. |
| **Babel** | Compiler / Transpiler | `^7.29.0` | `babel.config.js` | Transpiles ES modules on the fly so Jest can run modern syntax seamlessly. |
| **Nodemon** | Hot Reloading | CLI (via npm script) | `package.json` (`npm run dev`) | Watches file changes in `src/` and automatically restarts the local development server. |
| **Git** | Version Control | System Git | `.gitignore` | Ignores `node_modules/`, logs, coverage output, and environment files (`.env`). |

---

## 10. Testing Stack

### Testing Architecture
The testing suite is structured into **Unit Tests** and **Integration Tests** using in-memory databases to ensure test isolation and prevent the need for running external database services.

```text
tests/
├── setup.js                      # In-memory Mongo & Redis setup/teardown
├── integration/                  # Supertest HTTP integration suites
│   ├── url.test.js               # Link generation, caching, redirect tests
│   └── analytic.test.js          # Aggregation, facet, and CSV export tests
└── unit/                         # Isolated unit test suites
    ├── services/                 # urlService and analyticService tests
    └── util/                     # Base62, validation, error class tests
```

### Testing Components
* **Test Runner:** **Jest (`^30.3.0`)**  
  * Configured in `jest.config.js` with `testEnvironment: 'node'`, `testTimeout: 60000`, and `collectCoverage: true`.
* **HTTP Assertions:** **Supertest (`^7.2.2`)**  
  * Makes mock HTTP requests directly against `app` without requiring the server to bind to a physical TCP port.
* **In-Memory MongoDB:** **`mongodb-memory-server` (`^11.0.1`)**  
  * Spins up an ephemeral, in-memory MongoDB instance in `tests/setup.js` for isolated test runs.
* **In-Memory Redis:** **`redis-memory-server` (`^0.16.0`)**  
  * Spins up an ephemeral, in-memory Redis instance in `tests/setup.js` to test cache and rate-limiting behaviors.
* **Load Testing:** **k6**  
  * Located in `load/`: contains load-testing scripts (`redirect.test.js`, `createShortURL.test.js`, `analytics.test.js`) designed to simulate up to 500 concurrent virtual users.

---

## 11. DevOps and Infrastructure

### Containerization (`Dockerfile`)
* **Base Image:** `node:22-slim` (minimal Debian distribution for reduced image size).
* **Working Directory:** `/usr/app`.
* **Dependency Layering:** Copies `package*.json` and executes `npm install --omit=dev` to exclude development dependencies from the production image.
* **Port Exposition:** Exposes port `5000`.
* **Execution Command:** `CMD [ "npm", "start" ]` (executes `cross-env NODE_ENV=production node src/index.js`).

### Multi-Container Orchestration (`docker-compose.yaml`)
Orchestrates three services on an isolated bridge network (`app-network`):
1. **`app-service`:** Built from local `Dockerfile`, mounts port `5000:5000`, and depends on `db_mongo` and `db_redis`.
2. **`db_mongo`:** Runs `mongo:latest` with port forwarding on `27017:27017` and persistent storage on volume `mongo-data`.
3. **`db_redis`:** Runs `redis:alpine` with persistent storage on volume `redis-data`.

### Missing Infrastructure Elements
* **CI/CD Pipelines:** **Not found in repo.** No `.github/workflows/`, GitLab CI, or Jenkins pipelines exist.
* **Cloud Infrastructure as Code:** **Not found in repo.** No Terraform, Helm charts, or Kubernetes manifests exist.

---

## 12. External Services and APIs

| External Service / SDK | SDK / Package Used | Where Invoked in Code | Environment Variables Required | Failure Handling Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **MongoDB Database** | `mongoose` (`^9.2.1`) | `src/db/connection.db.js` | `MONGODB_URI` | Terminates process on startup error (`process.exit(1)`). |
| **Redis Cache** | `ioredis` (`^5.9.3`) | `src/db/redisClient.js` | `REDIS_URL` | Automatic reconnect with backoff; falls back to MongoDB during redirects. |
| **Local MaxMind GeoIP** | `geoip-lite` (`^1.4.10`)| `src/service/urlService.js` | None (Local binary file) | Returns `null` on missing IP; fields default to `"Unknown"`. |
| **Resend Email Service** | `resend` (`^6.9.2`) | Unused | None in active use | Scaffolded dependency; never imported or called in `src/`. |
| **Nodemailer SMTP** | `nodemailer` (`^8.0.1`)| Unused | None in active use | Scaffolded dependency; never imported or called in `src/`. |

---

## 13. Environment Variables

*Environment variables are loaded and exposed through `src/util/env.js`:*

| Variable Name | Purpose | Example Format | Required / Optional | Where Read in Codebase |
| :--- | :--- | :--- | :--- | :--- |
| **`PORT`** | The network port Express listens on. | `5000` | Optional (Defaults in runtime) | `src/index.js`, `src/util/env.js` |
| **`CLIENT_URL`** | The frontend origin allowed by the CORS policy. | `http://localhost:3000` | Required for CORS | `src/index.js`, `src/util/env.js` |
| **`MONGODB_URI`** | MongoDB connection string. | `mongodb://localhost:27017/url_shortener` | **Required** | `src/db/connection.db.js`, `src/util/env.js` |
| **`REDIS_URL`** | Redis connection URI. | `redis://localhost:6379` | **Required** | `src/db/redisClient.js`, `src/util/env.js` |
| **`BASE_URL`** | Base URL prepended to generated short codes. | `http://localhost:5000/` | **Required** | `src/service/urlService.js`, `src/controller/urlList.controller.js` |
| **`NODE_ENV`** | Current execution environment. | `development` / `production` / `test` | Optional (Defaults to development) | `package.json`, `src/middleware/error.middleware.js` |

---

## 14. Scripts and Commands

| Script Command | Actual Shell Execution | When to Use It |
| :--- | :--- | :--- |
| **`npm run dev`** | `cross-env NODE_ENV=development nodemon src/index.js` | During local development. Starts server with automatic hot-reloading on file save. |
| **`npm start`** | `cross-env NODE_ENV=production node src/index.js` | In production environments and Docker containers. Starts server without nodemon overhead. |
| **`npm test`** | `cross-env NODE_ENV=test jest` | Runs automated unit and integration tests using in-memory databases and outputs coverage. |
| **`npm run lint`** | `eslint .` | Runs ESLint across all files to detect syntax errors, code smells, and style issues. |
| **`npm run lint:fix`**| `eslint . --fix` | Runs ESLint and automatically applies available code fixes. |
| **`npm run format`** | `prettier . --write` | Runs Prettier to reformat all files according to project formatting standards. |

---

## 15. Setup Guide for a Fresh Machine

### Prerequisites
* **Node.js:** Version 22 LTS or newer.
* **npm:** Version 10 or newer.
* **Docker Desktop:** (If running via containerized orchestration).

### Quickstart Option 1: Docker Compose (Fastest)
1. Clone the repository and navigate to the project directory:
   ```bash
   git clone <repo-url>
   cd url_shortner
   ```
2. Build and launch all three services:
   ```bash
   docker-compose up --build
   ```
3. Verify containers are active:
   ```bash
   docker ps
   ```

---

### Quickstart Option 2: Local Bare Metal Setup
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root:
   ```env
   PORT=5000
   CLIENT_URL=http://localhost:3000
   MONGODB_URI=mongodb://localhost:27017/url_shortner
   REDIS_URL=redis://localhost:6379
   BASE_URL=http://localhost:5000/
   NODE_ENV=development
   ```
3. Ensure local MongoDB (port `27017`) and Redis (port `6379`) instances are running.
4. Start the application in development mode:
   ```bash
   npm run dev
   ```

---

### Verification Checklist
* [ ] Application logs confirm: `Server is running on PORT : 5000`
* [ ] Redis connection logged: `Redis connected Successfully.`
* [ ] Redis eviction policy logged: `Redis Eviction Policy set to: allkeys-lru`
* [ ] Create a short URL:
  ```bash
  curl -X POST http://localhost:5000/api/v1/url/ -H "Content-Type: application/json" -d "{\"orgURL\": \"https://github.com\"}"
  ```
* [ ] Execute all automated tests:
  ```bash
  npm test
  ```

---

## 16. Version Compatibility

* **Node.js 22 & Native ES Modules:** The project declares `"type": "module"`, requiring Node.js $\ge 18$. Node.js 22 is explicitly pinned in the Dockerfile.
* **Express v5 Migration:** Express 5.x handles rejected asynchronous promises in route handlers without unhandled rejection crashes.
* **Babel & Jest Configuration:** Because the project uses native ES modules (`import/export`), Jest requires `babel-jest` and `@babel/preset-env` targeting the current Node.js version (`node: 'current'`) to transpile files during test execution.
* **Mongoose v9:** Requires MongoDB server version 4.4 or higher.

---

## 17. Dependency Health Review

### Dependency Audit Findings

| Package Name | Category | Audit Finding | Recommended Engineering Action |
| :--- | :--- | :--- | :--- |
| **`resend`** | Unused Dependency | Installed in `package.json`, but never imported or called in `src/`. | Remove from `package.json` to reduce container image size and install times. |
| **`nodemailer`** | Unused Dependency | Installed in `package.json`, but never imported or called in `src/`. | Remove from `package.json` until email notification features are actively scheduled. |
| **`bcrypt`** | Unused Dependency | Native C++ compilation dependency installed, but unused. Slows down container builds. | Remove from `package.json` until user authentication is implemented. |
| **`cookie-parser`** | Unused Dependency | Installed in `package.json`, but never mounted in `src/index.js`. | Remove from `package.json` or mount as middleware if cookie sessions are needed. |
| **`jsonwebtoken`** | Unused Dependency | Installed in `package.json`, but never imported in application routes. | Remove from `package.json` until JWT authentication is implemented. |
| **`geoip-lite`** | Local Binary DB | The embedded IP database ages over time as IP allocations change. | Add a periodic npm update or database refresh script (`npm run-script updatedb`). *[VERIFY]* |

---

## 18. Technology Map by Feature

| Feature ID | Feature Name | Core Technologies & Libraries Used |
| :--- | :--- | :--- |
| **F-1** | Atomic Base62 Short URL Generation | Express 5, Mongoose 9 (`Counter`, `shortURL`), Native `BigInt`, Zod |
| **F-2** | Configurable URL Expiration (TTL) | Mongoose 9 (MongoDB background TTL index) |
| **F-3** | Sub-10ms Cached Redirection | Express 5, Redis, `ioredis`, Mongoose 9 |
| **F-4** | Non-Blocking Click Telemetry | `geoip-lite`, `ua-parser-js`, Mongoose 9 (`Analytics`, `shortURL`), Pino |
| **F-5** | Global Multi-Faceted Analytics | Mongoose 9 (`$facet`, `$lookup`, `$unwind`), Express 5 |
| **F-6** | Single-Code Cached Analytics | Redis (`ioredis` Hashes and Key mappings), Mongoose 9 (`$facet`) |
| **F-7** | Hourly and Daily Trend Telemetry | Mongoose 9 (`$dateToString`, `$hour` with timezone offset), Redis Hashes |
| **F-8** | CSV Analytics Report Export | `@json2csv/plainjs`, Mongoose 9, Express 5 |
| **F-9** | Multi-Tier Redis Rate Limiting | `express-rate-limit`, `rate-limit-redis`, Redis |
| **F-10** | Active URL Listing | Mongoose 9, Express 5 |
| **F-11** | Email Dispatch System | `nodemailer`, `resend`, Mongoose 9 (`Email` model) *(Scaffolded / Inactive)* |
| **F-12** | User Management & Auth | `bcrypt`, `jsonwebtoken`, `libphonenumber-js`, Zod *(Scaffolded / Inactive)* |

---

## 19. Interview and Explanation Guide

### 2-Minute Spoken Walkthrough of the Tech Stack
> "Our application is a high-performance URL shortening and analytics microservice running on Node.js 22 and Express 5 with native ES Modules.
>
> On the persistence side, we pair MongoDB with Redis using a cache-aside pattern. MongoDB handles persistent link documents, atomic counter sequences, and click telemetry logs, utilizing TTL indexes for automatic link expiration. Redis serves as our caching tier—caching destination URLs with dynamic TTLs, storing analytical facets in Redis hashes, and managing distributed rate limits via rate-limit-redis.
>
> To track visitor telemetry without hurting redirect latency, we avoid third-party network APIs entirely. We parse visitor IP addresses using a local binary database with geoip-lite and parse user-agents with ua-parser-js. This gives us geographic and device breakdowns in microseconds without network latency or external API costs.
>
> Our generation algorithm guarantees zero hash collisions by passing an atomic sequence counter through a BigInt-safe Base62 encoder.
>
> For code quality, we use Zod for validation, Pino for structured logging, and Helmet and CORS for security. Automated testing is built on Jest and Supertest, using mongodb-memory-server and redis-memory-server to run full integration test suites without external database dependencies."

---

### 20 Technical Interview Questions & Answers

#### 1. Why use Express 5 over Express 4?
* **Answer:** Express 5 handles rejected promises in route handlers and middleware automatically. In Express 4, unhandled promise rejections required explicit `.catch(next)` wrappers or custom utilities to prevent hanging requests. *(File: `package.json`, `src/index.js`)*

#### 2. What is the role of `ioredis` compared to the standard `redis` package?
* **Answer:** `ioredis` provides built-in support for cluster mode, sentinel, automatic reconnection with backoff, and transparent command queuing. It also allows direct configuration commands during connection events, which we use to set `maxmemory 256mb` and `allkeys-lru`. *(File: `src/db/redisClient.js`)*

#### 3. Why is `BigInt` necessary in `src/util/hashGenerator.js`?
* **Answer:** Standard JavaScript numbers are 64-bit floating point values that lose integer precision above $2^{53} - 1$ (`Number.MAX_SAFE_INTEGER`). Using `BigInt` prevents numeric truncation and character corruption when sequence counters grow large.

#### 4. How does the MongoDB TTL index work, and where is it configured?
* **Answer:** Configured in `src/model/url.model.js` via `expiresAt: { type: Date, index: { expires: 0 } }`. A background thread in MongoDB checks this index every 60 seconds and automatically removes documents whose `expiresAt` timestamp has passed.

#### 5. Why use `rate-limit-redis` instead of the default memory store in `express-rate-limit`?
* **Answer:** The default memory store tracks request counts in the local process memory. When running multiple container instances behind a load balancer, each instance would maintain separate counters. `rate-limit-redis` centralizes request counts in Redis so limits are enforced across all containers. *(File: `src/middleware/limiter.middleware.js`)*

#### 6. Why use `geoip-lite` rather than a cloud geolocation API?
* **Answer:** Cloud geolocation APIs introduce network latency (50–200ms per click) and ongoing API costs. `geoip-lite` uses a local binary database in server memory, resolving lookups in microseconds with zero network overhead. *(File: `src/service/urlService.js`)*

#### 7. What is the trade-off of using `geoip-lite`?
* **Answer:** The local binary database is static. As IP allocations change over time, the database can become outdated unless periodically updated via database refresh scripts.

#### 8. Why use `@json2csv/plainjs` instead of converting objects to CSV manually?
* **Answer:** Manual string concatenation often fails to handle edge cases like commas inside strings, quotes, newlines, and unicode characters. `@json2csv/plainjs` handles standard RFC 4180 CSV escaping safely. *(File: `src/service/analyticService.js`)*

#### 9. Why is `pino` preferred over `console.log` or `winston`?
* **Answer:** `console.log` is synchronous and can block the single-threaded Node.js event loop during heavy I/O. `pino` is optimized for asynchronous, structured JSON logging with minimal CPU overhead. *(File: `src/util/logger.js`)*

#### 10. How does the testing suite run without physical MongoDB or Redis instances?
* **Answer:** `tests/setup.js` uses `mongodb-memory-server` and `redis-memory-server`. These packages start ephemeral database binaries in memory during test execution and shut them down when tests complete.

#### 11. Why does the project include `babel` alongside Jest?
* **Answer:** The project uses native ES modules (`"type": "module"`). Jest historically runs in CommonJS by default. `babel-jest` with `@babel/preset-env` transpiles ES module syntax on the fly so Jest can execute tests without runtime module errors. *(File: `babel.config.js`)*

#### 12. What do the five unused dependencies in `package.json` tell you about the codebase?
* **Answer:** *Honest Answer:* Dependencies like `bcrypt`, `jsonwebtoken`, `nodemailer`, `resend`, and `cookie-parser` indicate that user authentication and email notifications were planned but not completed. Leaving them in `package.json` adds unnecessary bloat to container builds and expands the dependency attack surface.

#### 13. Why use `cross-env` in the npm scripts?
* **Answer:** Setting environment variables via shell commands differs across platforms (e.g., `export NODE_ENV=production` on Linux vs. `set NODE_ENV=production` on Windows). `cross-env` normalizes this across all operating systems. *(File: `package.json`)*

#### 14. What does `app.set('trust proxy', 1)` in `src/index.js` do?
* **Answer:** It tells Express that the app is running behind a reverse proxy (such as Nginx, AWS ALB, or Cloudflare) and to trust the first hop in the `X-Forwarded-For` header. Without this, `req.ip` would reflect the proxy's internal IP address rather than the actual visitor's IP.

#### 15. How are Redis Hashes used for caching single-link analytics?
* **Answer:** Instead of caching all analytics as one large JSON string, the service stores precomputed facet arrays in a Redis Hash (`stats:<id>`) using `hset` and retrieves them via `hgetall` with a 300-second TTL. *(File: `src/service/analyticService.js`)*

#### 16. What is the difference between `lean()` and standard Mongoose queries in CSV exports?
* **Answer:** In `exportAnalyticsCSV` (`src/service/analyticService.js`), `Analytics.find(...).lean()` bypasses the instantiation of full Mongoose document instances, returning plain JavaScript objects. This significantly reduces memory usage and speeds up queries over large datasets.

#### 17. Why is `libphonenumber-js` in `package.json` if phone validation is commented out?
* **Answer:** It was imported for a phone number validation utility (`validContactNo` in `src/util/validation.js`), but the feature was commented out when user authentication was deprioritized.

#### 18. What would happen if Redis ran out of memory?
* **Answer:** Because Redis is configured on connection with `allkeys-lru` and `maxmemory 256mb` (`src/db/redisClient.js`), it will automatically evict the least recently used keys to make room for new data rather than throwing out-of-memory errors.

#### 19. How does `k6` fit into the repository?
* **Answer:** `load/` contains k6 test scripts that run performance and stress tests against the running server, verifying that redirects stay under 200ms and analytics endpoints stay under 500ms under loads of up to 500 virtual users.

#### 20. If you could remove three packages from this project right now, which would you pick and why?
* **Answer:** I would remove `resend`, `nodemailer`, and `bcrypt`. None of them are imported or used in the active application code. Removing them would reduce `node_modules` size, eliminate native C++ compilation steps during Docker builds, and reduce the overall dependency attack surface.

---

## 20. Glossary

* **Cache-Aside Pattern:** A caching pattern where the application reads from cache first, loads from the database on a miss, and writes the retrieved data back to the cache with a TTL.
* **ECMAScript Modules (ESM):** The official JavaScript module standard using `import` and `export` statements, enabled in Node.js via `"type": "module"`.
* **LRU (Least Recently Used) Eviction:** A cache eviction strategy where the keys that have not been read or written for the longest time are discarded first when memory limits are reached.
* **TTL (Time To Live):** A lifespan counter attached to a cache key or database document. When the TTL expires, the record is automatically purged.
* **Reverse Proxy:** A server placed in front of web applications that forwards client requests, handles SSL termination, and passes client IPs via `X-Forwarded-*` headers.
* **Faceted Search / Aggregation:** A database aggregation technique that runs multiple independent grouping operations in parallel over a single input dataset.
* **In-Memory Testing Server:** A lightweight, ephemeral database engine that runs directly in memory for automated test execution without external infrastructure dependencies.

---

## 21. Open Questions

1. **Scaffolded Dependencies:**  
   Should the team remove `bcrypt`, `jsonwebtoken`, `nodemailer`, `resend`, and `cookie-parser` now to streamline Docker builds, or are user authentication and email features planned for the next release cycle?
2. **GeoIP Database Updates:**  
   How often should the local `geoip-lite` database be refreshed, and should this update step be integrated into the Docker build process?
3. **Timezone Configuration:**  
   Should the hardcoded `+05:30` (IST) timezone offset in Mongoose trend aggregations be made dynamic or standardized to UTC?
4. **CI/CD Integration:**  
   When will automated GitHub Actions or GitLab CI workflows be introduced to run `npm test` and `npm run lint` on incoming pull requests?
