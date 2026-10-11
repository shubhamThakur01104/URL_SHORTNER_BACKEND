# Project Requirement Description (PRD): URL Shortener & Analytics API

**Document Version:** 1.0.0  
**Project Name:** `url_shortner`  
**System Type:** Backend RESTful Web Service  
**Target Audience:** Software Engineers, System Architects, Quality Assurance Engineers, Technical Interviewers, and Product Stakeholders  

---

## 1. Project Summary

### Plain-Language Overview
This project is a high-performance backend application that converts long, unwieldy web links (like long tracking URLs) into short, clean codes (such as `http://localhost:5000/17K1jt`). When a visitor clicks or opens the short link in their browser, the system looks up the destination address and immediately redirects the user there. In the background—without slowing down the visitor's browsing experience—the system inspects the incoming network request to identify the visitor's country, city, web browser, operating system, and device type. It aggregates this information into analytical dashboards and exportable spreadsheet reports (CSV files).

### One-Line Elevator Pitch
A production-grade URL shortening and click-telemetry microservice built with Express.js, MongoDB, and Redis that delivers sub-10ms redirects and real-time geographical and device analytics.

### 30-Second Spoken Pitch
> "I built a production-ready URL shortener and analytics microservice in Node.js and Express. It uses an atomic counter with Base62 encoding to produce short links, MongoDB for persistent storage with TTL auto-expiration, and Redis as an in-memory cache to handle redirects and rate limiting at scale. When a user hits a short link, the system executes an HTTP 307 redirect directly from the Redis cache in single-digit milliseconds, while asynchronously logging client IP geolocation and device metadata without blocking the redirect. It also exposes full aggregation dashboards, hourly trend breakdowns, and automated CSV report exports."

---

## 2. Problem Statement and Purpose

### The Problems Solved
1. **Unmanageable Link Length:** Modern URLs frequently contain query strings, affiliate tags, and tracking parameters exceeding 200 characters. These look untrustworthy in marketing communications, break character limits in SMS/social media, and cannot be easily transcribed by humans.
2. **Lack of Traffic Telemetry:** Creators, marketers, and developers who distribute links often have zero visibility into who is clicking their links, what geographic markets are responding, or whether traffic is coming from desktop or mobile devices.
3. **High Latency at Scale:** Traditional web applications perform heavy relational database queries on every incoming click, causing slowdowns or crashes when a link goes viral.
4. **Data Redundancy and Race Conditions:** Simple random string generators risk database collisions and require expensive unique-check retries as the dataset grows.

### Who Suffers from These Problems
* **Marketing and Growth Teams:** Cannot track multi-channel campaign conversions or understand visitor demographics.
* **End Users:** Face slow link redirects and cluttered, suspicious-looking URLs in messaging channels.
* **Backend Engineers:** Face performance bottlenecks when link-redirection databases collapse under burst traffic spikes.

### Why This Project Is Worth Building
By separating the **critical path** (URL redirection via an in-memory Redis cache) from the **analytical path** (non-blocking, asynchronous MongoDB document insertion), this system achieves high throughput and resilience against traffic surges.

*(Marked as [INFERRED] from codebase architectural patterns in `src/service/urlService.js` and `src/db/redisClient.js`).*

---

## 3. Target Users and Roles

The application in its current state is a public/unauthenticated REST API. Authorization role gates are not active in the runtime code.

| Role / User Type | Description & Capabilities | File Reference | Status in Code |
| :--- | :--- | :--- | :--- |
| **Anonymous Link Creator** | Any client or application capable of sending HTTP POST requests to create short URLs and query the global link catalog. | `src/controller/url.controller.js`, `src/controller/urlList.controller.js` | **Active / Functional** |
| **End Visitor (Link Clicker)** | Anyone navigating to `/:shortCode`. Receives an HTTP 307 temporary redirect. Does not interact with API payloads directly. | `src/route/redirection.router.js`, `src/controller/url.controller.js` | **Active / Functional** |
| **Data Analyst / Administrator** | Any client requesting aggregate analytics, hourly trend charts, or CSV export files for short codes. | `src/route/analysis.router.js`, `src/controller/analysis.controller.js` | **Active / Functional** |
| **Registered User (`User`)** | A user profile intended to own links via the `generatedBy` ObjectId reference on `shortURL`. | `src/model/url.model.js` (line 15) | **Inactive / Scaffolded Only** (No user auth controllers exist) |

*(Note: Auth validation schemas for `validFullName`, `validEmail`, `validContactNo`, and `validPassword` exist in `src/util/validation.js` but are commented out).*

---

## 4. Complete Feature List

| Feature ID | Feature Name | Description | Key Implementation Files | Status |
| :--- | :--- | :--- | :--- | :--- |
| **F-1** | Atomic Base62 Short URL Generation | Generates short codes using an atomic database counter and BigInt-safe Base62 encoding. | `src/service/urlService.js`, `src/model/counter.model.js`, `src/util/hashGenerator.js` | **Complete** |
| **F-2** | Configurable URL Expiration (TTL) | Allows custom expiration timestamps or defaults to 30 days. Auto-evicted by MongoDB. | `src/service/urlService.js`, `src/model/url.model.js` | **Complete** |
| **F-3** | Sub-10ms Cached Redirection | Resolves short codes to original URLs using Redis caching before falling back to MongoDB. | `src/route/redirection.router.js`, `src/service/urlService.js`, `src/db/redisClient.js` | **Complete** |
| **F-4** | Non-Blocking Click Telemetry Capture | Asynchronously parses IP geolocation, device, browser, and OS without delaying HTTP redirects. | `src/service/urlService.js`, `src/model/analysis.model.js` | **Complete** |
| **F-5** | Global Multi-Faceted Analytics Dashboard | MongoDB aggregation pipeline grouping active URLs by country, city, region, device, OS, browser, and referrers. | `src/service/analyticService.js`, `src/controller/analysis.controller.js` | **Complete** |
| **F-6** | Single-Code Cached Analytics Breakdown | Provides complete metric breakdowns for a single short code with two-tier Redis caching (hash + map). | `src/service/analyticService.js`, `src/route/analysis.router.js` | **Complete** |
| **F-7** | Hourly and Daily Trend Telemetry | Provides time-series aggregations grouped by hour of the day (in IST +05:30) and calendar date. | `src/service/analyticService.js`, `src/route/analysis.router.js` | **Complete** |
| **F-8** | CSV Analytics Report Export | Streams a downloadable spreadsheet of all raw click events for a specific short code. | `src/service/analyticService.js`, `src/controller/analysis.controller.js` | **Complete** |
| **F-9** | Multi-Tier Redis Rate Limiting | Rate limits API requests using Redis counters across 3 distinct tiers (create, redirect, report). | `src/middleware/limiter.middleware.js` | **Complete** |
| **F-10** | Active URL Listing | Lists all active short URLs sorted newest to oldest with click counts. | `src/controller/urlList.controller.js`, `src/route/url.router.js` | **Complete** |
| **F-11** | Email Dispatch System | Database model for email logs; external dependencies `resend` and `nodemailer` installed. | `src/model/emailservice.model.js`, `package.json` | **Partial / Unused** |
| **F-12** | User Management & Auth | Schema references `generatedBy: User`; commented validation for passwords, emails, phones. | `src/model/url.model.js`, `src/util/validation.js` | **Incomplete / Scaffolded** |

---

## 5. Feature-by-Feature Explanation

### F-1: Atomic Base62 Short URL Generation

* **What the user sees and does:**  
  The user sends an HTTP `POST` request to `/api/v1/url/` with a JSON payload containing the original URL (`orgURL`) and an optional ISO-8601 expiration date (`expiresAt`). The client receives a `200 OK` response with the complete shortened URL string.
* **What happens behind the scenes:**
  1. The request enters `src/route/url.router.js` through `createLimiter` middleware.
  2. `src/controller/url.controller.js` invokes `shortURLGeneratorService(data)` in `src/service/urlService.js`.
  3. `validateURL(orgURL)` in `src/util/validation.js` cleans the URL, checks for malformed syntax (e.g., duplicate dots), and ensures `http://` or `https://` is prepended.
  4. `Counter.findOneAndUpdate({ id: 'urlCounter' }, { $inc: { counter: 1 } }, { new: true, upsert: true })` in `src/model/counter.model.js` atomically increments an integer sequence counter in MongoDB.
  5. `encodeBase62(counter)` in `src/util/hashGenerator.js` converts the numeric counter into a compact alphanumeric string using `BigInt` operations to prevent integer overflow.
  6. `shortURL.create(...)` in `src/model/url.model.js` writes the new document to MongoDB.
  7. The controller wraps the resulting full URL in `ApiResponse` (`src/util/ApiResponse.js`) and returns it to the client.
* **Database & External Services:**  
  Touches MongoDB collections `counters` and `shorturls`.
* **Edge cases and error handling:**  
  * If `orgURL` is not a valid web URL, `validateURL` throws `AppError` with status `400 Bad Request`.
  * If MongoDB is unreachable, `shortURLGeneratorService` catches the error and throws `AppError` with status `500 Internal Server Error`.

---

### F-2: Configurable URL Expiration (TTL)

* **What the user sees and does:**  
  The user can specify an exact expiration date (`expiresAt`) when generating a short URL. If left empty, the system automatically assigns an expiration 30 days into the future.
* **What happens behind the scenes:**
  1. In `src/service/urlService.js` (`shortURLGeneratorService`), the service checks `if (!expiresAt)`.
  2. If missing, it computes `new Date()` plus 30 calendar days (`date.setDate(date.getDate() + 30)`).
  3. The `expiresAt` date is stored in MongoDB inside `src/model/url.model.js`.
  4. MongoDB's background TTL index (`expiresAt: { type: Date, index: { expires: 0 } }`) marks expired documents for automatic deletion by the database engine.
* **Database & External Services:**  
  MongoDB background worker thread (TTL index monitoring on `shorturls`).
* **Edge cases and error handling:**  
  * If an expired link is accessed before MongoDB's background thread physically purges it, `urlRedirectionService` checks `originalURL.expiresAt < new Date()` and explicitly rejects the request with `404 Not Found`.

---

### F-3: Sub-10ms Cached Redirection

* **What the user sees and does:**  
  The visitor requests `GET /:shortCode` in any web browser or HTTP client. The system immediately responds with an HTTP status `307 Temporary Redirect` and points the `Location` header to the original destination URL.
* **What happens behind the scenes:**
  1. The request hits `src/route/redirection.router.js` through `redirectLimiter`.
  2. `src/controller/url.controller.js` invokes `urlRedirectionService(shortCode, req)`.
  3. `validShortCode(shortCode)` in `src/util/validation.js` checks that the code is at least 4 characters long and contains only alphanumeric characters (`/^[a-zA-Z0-9]+$/`).
  4. The service queries Redis (`src/db/redisClient.js`) with key `url:<shortCode>`.
  5. **Cache Hit:** If found in Redis, the JSON string is parsed into memory immediately, skipping MongoDB entirely.
  6. **Cache Miss:** If Redis returns `null`, the service queries MongoDB: `shortURL.findOne({ shortCode: validatedCode })`.
  7. If found, active (`isActive: true`), and not expired, the service calculates the remaining lifetime in seconds (`Math.min(remainingTime, 3600)`) and caches the record in Redis with dynamic TTL: `redis.set('url:<shortCode>', JSON.stringify(finalData), 'EX', ttl)`.
  8. The controller issues `res.redirect(StatusCodes.TEMPORARY_REDIRECT, orgURL)`.
* **Database & External Services:**  
  Touches Redis first (key `url:<shortCode>`); touches MongoDB collection `shorturls` only on cache miss.
* **Edge cases and error handling:**  
  * If Redis crashes or fails, `urlRedirectionService` logs the failure and gracefully falls back to MongoDB without failing the user's redirect request.
  * If the short code does not exist, is marked `isActive: false`, or has expired, it throws `AppError("URL not exist or expired", 404)`.
  * If the short code contains special characters or is less than 4 characters, `validShortCode` throws `AppError("Invalid Short URL", 406)`.

---

### F-4: Non-Blocking Click Telemetry Capture

* **What the user sees and does:**  
  The visitor experiences zero perceived delay during link redirection. Telemetry logging happens completely behind the scenes.
* **What happens behind the scenes:**
  1. Inside `urlRedirectionService` in `src/service/urlService.js`, client metadata is harvested from request headers: IP address (`req.ip`), User-Agent (`req.headers['user-agent']`), and Referrer (`req.headers['referer']`).
  2. Local development loopback IP `::1` is automatically substituted with a public IP (`47.15.230.222`) so that GeoIP lookups function properly during local testing.
  3. `captureAnalytics(finalData._id, analyticsData)` is invoked **without an `await` keyword**, detaching it from the HTTP response pipeline.
  4. `captureAnalytics` queries `geoip-lite` (`geoip.lookup(ip)`) to resolve city, region, and country.
  5. It parses the browser, OS, and device type using `ua-parser-js` (`new UAParser(userAgent).getResult()`).
  6. It increments the click counter in MongoDB: `shortURL.findByIdAndUpdate(orgUrlId, { $inc: { click: 1 } })`.
  7. It inserts a new click event document into MongoDB via `Analytics.create(...)` in `src/model/analysis.model.js`.
* **Database & External Services:**  
  MongoDB collections `shorturls` and `analytics`. Uses embedded databases `geoip-lite` and `ua-parser-js`.
* **Edge cases and error handling:**  
  * If `captureAnalytics` fails (for example, if the MongoDB analytics collection write fails), `.catch(err => logger.error(...))` intercepts the error. The visitor's redirect has already completed successfully.
  * If an IP address cannot be geolocated or a User-Agent is empty, the system defaults fields to `"Unknown"`, `"Direct"`, or `"Desktop"`.

---

### F-5: Global Multi-Faceted Analytics Dashboard

* **What the user sees and does:**  
  An analyst makes a `GET` request to `/api/v1/analysis/` and receives an aggregated summary of all click events across all active links in the entire system.
* **What happens behind the scenes:**
  1. `src/route/analysis.router.js` passes the request through `redirectLimiter` to `getAllDetails` in `src/controller/analysis.controller.js`.
  2. The controller calls `getAllDetailsService()` in `src/service/analyticService.js`.
  3. A MongoDB aggregation pipeline executes on `shortURL`:
     * Matches only links where `isActive: true`.
     * Performs a `$lookup` joining the `analytics` collection on `shortUrlId`.
     * Unwinds the joined `analyticsData` array.
     * Executes a `$facet` operator to compute 8 groupings in parallel in a single database pass:
       * `categorizedByRegion`
       * `categorizedByCountry`
       * `categorizedByCity`
       * `categorizedByReferrer`
       * `categorizedByDevice`
       * `categorizedByBrowser`
       * `categorizedByOS`
       * `countClickOnEachLink` (sorted in descending order by total clicks).
  4. The result is returned in standard `ApiResponse` JSON format.
* **Database & External Services:**  
  MongoDB collections `shorturls` and `analytics`.
* **Edge cases and error handling:**  
  * If no URLs exist or no click events have been recorded, the aggregation returns empty arrays for each facet rather than failing.
  * Database errors throw `AppError("Internal Server Error", 500)`.

---

### F-6: Single-Code Cached Analytics Breakdown

* **What the user sees and does:**  
  A user sends a `GET` request to `/api/v1/analysis/:shortCode` to view metrics for a specific link.
* **What happens behind the scenes:**
  1. Handled by `getParticualShortCodeDetail` in `src/controller/analysis.controller.js` and `getParticualShortCodeDetailService` in `src/service/analyticService.js`.
  2. Validates the short code using `validShortCode(shortCode)`.
  3. **Two-Tier Redis Cache Lookup:**
     * Checks string key `map:<shortCode>` to find the corresponding MongoDB `shortURLId`.
     * If the mapping exists, queries Redis hash `stats:<shortURLId>` using `redis.hgetall()`.
     * If the hash exists, parses each JSON field and immediately returns the cached data.
  4. **Cache Miss Flow:**
     * Finds the link in MongoDB: `shortURL.findOne({ shortCode }).select('_id')`.
     * Saves the ID mapping in Redis: `redis.set('map:<shortCode>', shortURLId, 'EX', 3600)`.
     * Aggregates click records in `Analytics.aggregate([ { $match: { shortUrlId } }, { $facet: ... } ])`.
     * Populates the Redis hash `stats:<shortURLId>` with stringified facet results and sets a 5-minute TTL: `redis.expire(statsKey, 300)`.
* **Database & External Services:**  
  Redis (keys `map:<shortCode>` and `stats:<shortURLId>`), MongoDB collections `shorturls` and `analytics`.
* **Edge cases and error handling:**  
  * If the short code does not exist in the database, throws `AppError("Invalid URL", 404)`.
  * If `map:<shortCode>` exists in Redis but the corresponding document was deleted from MongoDB, the system detects this on cache miss and returns `404 Not Found`.

---

### F-7: Hourly and Daily Trend Telemetry

* **What the user sees and does:**  
  The user calls `GET /api/v1/analysis/:shortCode/trend` to view click trends by hour of day and calendar date.
* **What happens behind the scenes:**
  1. Handled by `getURLAnalyticsTrendService` in `src/service/analyticService.js`.
  2. Validates `shortCode`.
  3. Checks Redis key `trend:<shortCode>` to get the `shortURLId`, then checks Redis hash `trend:<shortURLId>`. If found, returns cached trend data.
  4. On cache miss: queries MongoDB for `shortURL._id`.
  5. Stores the code-to-ID mapping in Redis with a 1-hour expiration: `redis.set('trend:<shortCode>', shortURLId, 'EX', 3600)`.
  6. Executes a MongoDB aggregation pipeline on `Analytics`:
     * `$match`: Filters by `shortUrlId`.
     * `$facet`:
       * `perHourClick`: Groups by `$hour` using Indian Standard Time timezone offset (`+05:30`): `{ $hour: { date: '$createdAt', timezone: '+05:30' } }`.
       * `perDayClick`: Groups by date formatted string in IST: `{ $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:30' } }`.
  7. Populates Redis hash `trend:<shortURLId>` and sets a 300-second (5-minute) TTL.
  8. Returns the result.
* **Database & External Services:**  
  Redis (keys `trend:<shortCode>`, `trend:<shortURLId>`), MongoDB collection `analytics`.
* **Edge cases and error handling:**  
  * Returns `404 Not Found` if the short code does not exist.
  * Gracefully returns empty arrays if the short code exists but has zero click events.

---

### F-8: CSV Analytics Report Export

* **What the user sees and does:**  
  The user sends a `GET` request to `/api/v1/analysis/:shortCode/generateReport`. Their browser downloads a file named `report-<shortCode>.csv`.
* **What happens behind the scenes:**
  1. Request passes through `reportLimiter` (strict limit: 5 requests per 15 minutes) in `src/middleware/limiter.middleware.js`.
  2. Invokes `getReport` in `src/controller/analysis.controller.js` and `exportAnalyticsCSV` in `src/service/analyticService.js`.
  3. Validates the short code.
  4. Verifies the link exists in `shortURL`.
  5. Queries all raw click logs: `Analytics.find({ shortUrlId }).select('ip city country region device browser os referrer clickDate -_id').lean()`.
  6. If no logs exist, throws `AppError("No analytics data found", 404)`.
  7. Uses `Parser` from `@json2csv/plainjs` to convert the JavaScript object array into standard CSV format.
  8. Sets HTTP response headers:
     * `Content-Type: text/csv`
     * `Content-Disposition: attachment; filename=report-<shortCode>.csv`
  9. Sends the raw CSV text with status `200 OK`.
* **Database & External Services:**  
  MongoDB collections `shorturls` and `analytics`.
* **Edge cases and error handling:**  
  * Throws `404 Not Found` if the URL does not exist or has zero click records.
  * Throws `429 Too Many Requests` if the user exceeds 5 downloads in 15 minutes.

---

### F-9: Multi-Tier Redis Rate Limiting

* **What the user sees and does:**  
  Normal users interact with the API without noticing rate limiting. Malicious or malfunctioning clients sending excessive requests receive an HTTP status `429 Too Many Requests`.
* **What happens behind the scenes:**
  1. Defined in `src/middleware/limiter.middleware.js` using `express-rate-limit` backed by `rate-limit-redis`.
  2. Each tier tracks client IPs using Redis key prefixes:
     * **Link Generation (`createLimiter`):** Prefix `rl-create:`, window: 1 minute, limit: 50 requests.
     * **Redirects and Queries (`redirectLimiter`):** Prefix `rl-red:`, window: 1 minute, limit: 100 requests.
     * **Heavy CSV Reports (`reportLimiter`):** Prefix `rl-report:`, window: 15 minutes, limit: 5 requests.
* **Database & External Services:**  
  Redis memory store.
* **Edge cases and error handling:**  
  * Rejection responses return structured JSON: `{ success: false, statusCode: 429, message: "Too many requests, please try again later." }`.

---

### F-10: Active URL Listing

* **What the user sees and does:**  
  A user sends a `GET` request to `/api/v1/url/` and receives a list of all active short URLs in the database, sorted newest first.
* **What happens behind the scenes:**
  1. Handled by `getAllURLs` in `src/controller/urlList.controller.js`.
  2. Queries MongoDB: `shortURL.find({ isActive: true }).select('orgURL shortCode click createdAt lastClickedAt').sort({ createdAt: -1 })`.
  3. Formats each record, assembling the full short URL using `process.env.BASE_URL || 'http://localhost:5000'`.
  4. Returns the list in an `ApiResponse` payload.
* **Database & External Services:**  
  MongoDB collection `shorturls`.
* **Edge cases and error handling:**  
  * Inactive links (`isActive: false`) are filtered out.
  * Note on `lastClickedAt`: The field is selected and returned as `null` because it is never written to during click capture.

---

## 6. Main User Journeys

### User Journey 1: Shortening and Sharing a Long URL
* **Story:** A marketing specialist wants to share a long campaign URL on social media. They submit the URL to the API and receive a concise short link to share.
* **Step-by-Step Flow:**
  1. User sends `POST /api/v1/url/` with `{ "orgURL": "https://example.com/very/long/path" }`.  
     *(File: `src/route/url.router.js`)*
  2. The `createLimiter` middleware checks the client's Redis rate-limit window.  
     *(File: `src/middleware/limiter.middleware.js`)*
  3. The controller delegates to `shortURLGeneratorService`.  
     *(File: `src/controller/url.controller.js`)*
  4. URL syntax is validated and standardized.  
     *(File: `src/util/validation.js`)*
  5. The sequence counter increments atomically in MongoDB.  
     *(File: `src/model/counter.model.js`)*
  6. Counter integer is encoded into Base62 characters.  
     *(File: `src/util/hashGenerator.js`)*
  7. The link record is saved in MongoDB with an expiration date.  
     *(File: `src/model/url.model.js`)*
  8. The API returns `200 OK` with `data: "http://localhost:5000/<shortCode>"`.  
     *(File: `src/util/ApiResponse.js`)*

---

### User Journey 2: Visitor Follows a Short Link (High-Speed Cached Redirect)
* **Story:** A mobile user taps a short link inside a messaging app. The system redirects their browser to the destination in milliseconds while logging their device and location.
* **Step-by-Step Flow:**
  1. Visitor's browser issues `GET /:shortCode`.  
     *(File: `src/route/redirection.router.js`)*
  2. `redirectLimiter` checks the rate-limit budget in Redis.  
     *(File: `src/middleware/limiter.middleware.js`)*
  3. `urlRedirection` invokes `urlRedirectionService`.  
     *(File: `src/controller/url.controller.js`)*
  4. Short code format is validated.  
     *(File: `src/util/validation.js`)*
  5. Redis cache lookup on `url:<shortCode>`.  
     *(File: `src/db/redisClient.js`)*
  6. **On Cache Hit:** Destination URL is read from memory immediately.  
     **On Cache Miss:** MongoDB is queried, and the destination is cached in Redis with a TTL.  
     *(File: `src/service/urlService.js`)*
  7. Background analytics collection `captureAnalytics` is initiated without awaiting its completion.  
     *(File: `src/service/urlService.js`)*
  8. Browser receives `307 Temporary Redirect` to the destination URL.  
     *(File: `src/controller/url.controller.js`)*
  9. In the background, `geoip-lite` and `ua-parser-js` parse metadata and write a record to MongoDB `analytics`.  
     *(File: `src/model/analysis.model.js`)*

---

### User Journey 3: Marketing Analyst Reviews Campaign Performance
* **Story:** An analyst wants to see how a campaign performed, inspect hourly click trends, and download raw click data for executive reporting.
* **Step-by-Step Flow:**
  1. Analyst calls `GET /api/v1/analysis/<shortCode>` to view link metrics.  
     *(File: `src/route/analysis.router.js`)*
  2. Redis cache is checked for precomputed metrics; falls back to a MongoDB aggregation on cache miss.  
     *(File: `src/service/analyticService.js`)*
  3. Analyst calls `GET /api/v1/analysis/<shortCode>/trend` to review hourly click distribution in IST.  
     *(File: `src/service/analyticService.js`)*
  4. Analyst calls `GET /api/v1/analysis/<shortCode>/generateReport`.  
     *(File: `src/route/analysis.router.js`)*
  5. `reportLimiter` validates the download rate limit.  
     *(File: `src/middleware/limiter.middleware.js`)*
  6. The system queries raw click documents and converts them to CSV format.  
     *(File: `src/service/analyticService.js`)*
  7. A CSV file named `report-<shortCode>.csv` is downloaded to the analyst's machine.  
     *(File: `src/controller/analysis.controller.js`)*

---

## 7. Functional Requirements

| ID | Requirement Statement | Feature ID | Source File Path |
| :--- | :--- | :--- | :--- |
| **FR-1** | System must accept an original URL via HTTP POST and return a Base62 shortened link. | F-1 | `src/service/urlService.js` |
| **FR-2** | System must normalize URLs missing a protocol by prepending `https://`. | F-1 | `src/util/validation.js` |
| **FR-3** | System must atomically increment an internal counter so no two links receive the same code. | F-1 | `src/model/counter.model.js` |
| **FR-4** | System must assign a 30-day default expiration when `expiresAt` is omitted. | F-2 | `src/service/urlService.js` |
| **FR-5** | System must reject requests for expired or inactive (`isActive: false`) URLs with HTTP 404. | F-2, F-3 | `src/service/urlService.js` |
| **FR-6** | System must redirect valid short code requests using HTTP 307 Temporary Redirect. | F-3 | `src/controller/url.controller.js` |
| **FR-7** | System must cache redirection mappings in Redis using the remaining link TTL (capped at 3600s). | F-3 | `src/service/urlService.js` |
| **FR-8** | System must fall back to MongoDB without failing redirects if Redis is unavailable. | F-3 | `src/service/urlService.js` |
| **FR-9** | System must capture client IP, country, region, city, device, OS, browser, and referrer asynchronously. | F-4 | `src/service/urlService.js` |
| **FR-10** | Redirection responses must not fail if background analytics logging fails. | F-4 | `src/service/urlService.js` |
| **FR-11** | System must provide aggregate analytics across all active URLs grouped into 8 facets. | F-5 | `src/service/analyticService.js` |
| **FR-12** | System must provide single-link analytics cached in Redis for 300 seconds. | F-6 | `src/service/analyticService.js` |
| **FR-13** | System must aggregate clicks by hour of the day and calendar date in timezone `+05:30`. | F-7 | `src/service/analyticService.js` |
| **FR-14** | System must stream click logs as a CSV file with `attachment` disposition headers. | F-8 | `src/controller/analysis.controller.js` |
| **FR-15** | System must enforce Redis rate limits: 50 req/min for link creation, 100 req/min for redirects, and 5 req/15min for reports. | F-9 | `src/middleware/limiter.middleware.js` |
| **FR-16** | System must list all active links sorted by creation date in descending order. | F-10 | `src/controller/urlList.controller.js` |

---

## 8. Non-Functional Requirements (Current State)

### Security
* **HTTP Security Headers:** Protected by `helmet()` in `src/index.js` (line 21), setting secure HTTP headers (XSS filtering, MIME sniffing protection, frameguard).
* **Cross-Origin Resource Sharing (CORS):** Enforces explicit origins via `ENV.CLIENT_URL` with credentials allowed in `src/index.js` (lines 14–19).
* **Proxy Safety:** `app.set('trust proxy', 1)` in `src/index.js` (line 12) ensures client IP addresses are accurately resolved when running behind reverse proxies.
* **Input Sanitization:** URL strings and short codes are validated with custom checks and regular expressions in `src/util/validation.js`.

### Validation
* URLs must contain valid domain structures and reject consecutive dots (`..`) in `src/util/validation.js`.
* Short codes must be at least 4 alphanumeric characters (`/^[a-zA-Z0-9]+$/`). Invalid inputs are rejected with status `406 Not Acceptable`.

### Performance & Scalability
* **In-Memory Caching:** High-frequency redirect lookups bypass MongoDB and resolve from Redis in sub-10ms latency.
* **LRU Memory Management:** Redis is configured on startup with `maxmemory 256mb` and `maxmemory-policy allkeys-lru` in `src/db/redisClient.js`.
* **Asynchronous Telemetry:** Analytics logging is detached from the HTTP response loop so database writes never delay redirects.
* **Load Tested:** Validated with k6 load scripts (`load/redirect.test.js`) targeting up to 500 virtual users with p95 latency targets under 200ms.

### Reliability & Fault Tolerance
* Redis connections implement automated reconnection retries with backoff: `Math.min(times * 50, 2000)` in `src/db/redisClient.js`.
* Redirection lookups wrap Redis in try/catch blocks and fall back to MongoDB on cache errors.
* Global error handling middleware (`src/middleware/error.middleware.js`) catches unhandled promise rejections and returns uniform error responses.

### Logging
* Uses `pino` (`src/util/logger.js`) for structured JSON logging across application services.

### Missing Non-Functional Requirements
* No authentication or authorization gates on admin and reporting endpoints.
* No API key management or per-tenant rate limits.
* Telemetry writes are direct database calls rather than queued through a message broker (e.g., BullMQ or Kafka). Under extreme click spikes, the database connection pool could experience saturation.

---

## 9. Technology Overview

| Technology | Category | Purpose in This Project | Source Reference |
| :--- | :--- | :--- | :--- |
| **Node.js (v22)** | Runtime | Server execution environment. Containerized on `node:22-slim`. | `Dockerfile` |
| **Express (v5.2.1)** | Web Framework | Routing, middleware orchestration, and HTTP request/response lifecycle. | `package.json`, `src/index.js` |
| **MongoDB & Mongoose (v9.2.1)**| Database & ODM | Persistent document storage for URLs, sequence counters, and click analytics. | `src/db/connection.db.js` |
| **Redis & ioredis (v5.9.3)** | In-Memory Cache | Sub-millisecond URL resolution, analytics caching, and distributed rate limiting. | `src/db/redisClient.js` |
| **geoip-lite (v1.4.10)** | Geolocation | Offline IP-to-city/country resolution without external API latency. | `src/service/urlService.js` |
| **ua-parser-js (v2.0.9)** | User-Agent Parser | Detects browser, operating system, and hardware device category from headers. | `src/service/urlService.js` |
| **@json2csv/plainjs (v7.0.6)**| File Exporter | Converts raw MongoDB analytics document arrays into downloadable CSV text. | `src/service/analyticService.js` |
| **express-rate-limit & rate-limit-redis** | Rate Limiting | Protects API endpoints against denial-of-service traffic surges. | `src/middleware/limiter.middleware.js` |
| **Helmet (v8.1.0)** | Security | Configures protective HTTP response headers. | `src/index.js` |
| **Pino (v10.3.1)** | Logging | Fast, structured logging for service events and errors. | `src/util/logger.js` |
| **Jest & Supertest** | Testing | Test framework with in-memory MongoDB and Redis test runners. | `jest.config.js`, `tests/setup.js` |
| **k6** | Load Testing | Performance load test scripts for benchmarking redirection and analytics. | `load/` directory |

---

## 10. Data Overview

### Core Data Models

#### 1. `shortURL` (`src/model/url.model.js`)
* Stores URL records.
* **Fields:**
  * `orgURL` (String, required): The original long destination URL.
  * `shortCode` (String, required, indexed): The Base62 short identifier.
  * `generatedBy` (ObjectId, ref: 'User', indexed): Scaffolded reference to a user document.
  * `createdAt` (Date): Creation timestamp.
  * `expiresAt` (Date, indexed with `expires: 0`): MongoDB TTL auto-deletion index.
  * `click` (Number, default 0): Running total click counter.
  * `isActive` (Boolean, default true): Soft-delete / active toggle.

#### 2. `Analytics` (`src/model/analysis.model.js`)
* Stores individual click events.
* **Fields:**
  * `shortUrlId` (ObjectId, ref: 'shortURL', required, indexed): Foreign key to the parent short URL.
  * `clickDate` (Date): Timestamp of the click event.
  * `ip` (String): IP address of the client.
  * `city`, `country`, `region` (String): Geolocation data derived from `geoip-lite`.
  * `device` (Enum: `['Desktop', 'Mobile', 'Tablet', 'Other']`): Hardware category.
  * `browser`, `os` (String): Software environment derived from `ua-parser-js`.
  * `referrer` (String, default 'Direct'): Originating referral page.
* **Index:** Compound index on `{ shortUrlId: 1, clickDate: -1 }`.

#### 3. `Counter` (`src/model/counter.model.js`)
* Stores global atomic counters.
* **Fields:**
  * `id` (String, required, unique): Sequence key identifier (e.g., `'urlCounter'`).
  * `counter` (Number, default 0): Current sequence value.

#### 4. `Email` (`src/model/emailservice.model.js`)
* Schema for email records. Not currently used in application workflows.
* **Fields:** `emailId`, `from`, `to`, `emailType`, `subject`, `content`, `timestamps`.

### Sensitive Data and Privacy
* **IP Addresses:** Raw IP addresses are stored directly in the `analytics` collection (`src/model/analysis.model.js`).  
  * *Privacy Risk:* Under regulations like GDPR and CCPA, IP addresses can be considered personal data. The codebase does not currently anonymize or hash stored IPs.
* **No Authentication Credentials Stored:** Passwords and tokens are not stored in the running system because authentication endpoints have not been implemented.

---

## 11. External Services and Integrations

| Service / Dependency | Where Called in Code | Configuration Required | Notes |
| :--- | :--- | :--- | :--- |
| **MongoDB** | `src/db/connection.db.js` | `MONGODB_URI` | Document database for persistent storage. |
| **Redis** | `src/db/redisClient.js` | `REDIS_URL` | In-memory cache and rate-limiting store. |
| **geoip-lite** | `src/service/urlService.js` (line 120) | None (Local binary database) | Runs locally in memory; requires no external API tokens. |
| **Resend / Nodemailer** | Listed in `package.json` | None in active use | Packages are installed, but no active imports or integrations exist in `src/`. |

---

## 12. Project Structure Walkthrough

### Folder Tree
```text
url_shortner/
├── Dockerfile                     # Production container build recipe (Node 22-slim)
├── docker-compose.yaml            # Multi-container orchestration (App, MongoDB, Redis)
├── package.json                   # Project dependencies, scripts, and engine specifications
├── jest.config.js                 # Jest test runner configuration with Babel transformation
├── babel.config.js                # Babel transpiler configuration for ES modules in tests
├── .env.docker                    # Docker environment variable template
├── docs/                          # Project documentation directory
├── load/                          # k6 load testing scripts
│   ├── createShortURL.test.js     # Load tests for link generation endpoint
│   ├── redirect.test.js           # Load tests for short link redirection throughput
│   └── analytics.test.js          # Load tests for analytics query performance
├── tests/                         # Automated test suites
│   ├── setup.js                   # In-memory Mongo and Redis test harness lifecycle
│   ├── integration/               # Integration tests with supertest
│   │   ├── url.test.js            # End-to-end tests for URL creation and redirection
│   │   └── analytic.test.js       # End-to-end tests for analytics queries and CSV exports
│   └── unit/                      # Unit tests for isolated functions
│       ├── services/              # Unit tests for urlService and analyticService
│       └── util/                  # Unit tests for Base62 encoding, validation, and error classes
└── src/                           # Application source code
    ├── index.js                   # Application entry point; Express app configuration
    ├── controller/                # HTTP request handlers
    │   ├── url.controller.js      # Handlers for link creation and redirection
    │   ├── urlList.controller.js  # Handler for listing active links
    │   └── analysis.controller.js # Handlers for analytics queries and CSV downloads
    ├── db/                        # Database connections
    │   ├── connection.db.js       # MongoDB Mongoose connection client
    │   └── redisClient.js         # Redis ioredis client with LRU policy configuration
    ├── middleware/                # Express middleware
    │   ├── error.middleware.js    # Global error response handler
    │   └── limiter.middleware.js  # Redis-backed rate limiting middleware
    ├── model/                     # Mongoose database schemas
    │   ├── url.model.js           # shortURL schema definition
    │   ├── analysis.model.js      # Analytics schema definition
    │   ├── counter.model.js       # Atomic sequence counter schema definition
    │   └── emailservice.model.js  # Email schema definition (unused)
    ├── route/                     # Express route registrations
    │   ├── url.router.js          # /api/v1/url routes
    │   ├── redirection.router.js  # /:shortCode redirection routes
    │   └── analysis.router.js     # /api/v1/analysis routes
    ├── service/                   # Core business logic
    │   ├── urlService.js          # Base62 generation, caching, redirect, and click capture
    │   └── analyticService.js     # MongoDB aggregation pipelines and CSV generation
    └── util/                      # Shared helper utilities
        ├── ApiError.js            # Custom operational error class (AppError)
        ├── ApiResponse.js         # Standard JSON response structure class
        ├── asyncHandler.js        # Controller try/catch wrapper utility
        ├── env.js                 # Environment variable loader
        ├── hashGenerator.js       # Base62 encoding implementation with BigInt
        ├── logger.js              # Pino logger configuration
        └── validation.js          # Zod and regex input validation functions
```

### Essential Files to Read First
1. `src/index.js` — The entry point. Explains how the Express server starts, how middleware is configured, and where routes are mounted.
2. `src/service/urlService.js` — Core business logic. Demonstrates the Base62 generation sequence, Redis caching patterns, and asynchronous click capture.
3. `src/service/analyticService.js` — Analytics logic. Shows the MongoDB aggregation pipelines and Redis hash caching strategy.
4. `src/middleware/limiter.middleware.js` — Shows how the API is protected using Redis-backed rate limits.
5. `src/util/hashGenerator.js` — Explains the Base62 mathematical algorithm using BigInt.
6. `tests/integration/url.test.js` — Demonstrates expected system behaviors, edge cases, and error responses.

---

## 13. How to Run the Project

### Prerequisites
* Node.js v20+ or v22+
* Running instances of MongoDB and Redis (or Docker Desktop)

### Option A: Running with Docker Compose (Recommended)
1. Ensure Docker Desktop is running.
2. In the project root, run:
   ```bash
   docker-compose up --build
   ```
3. Docker starts 3 containers:
   * `url_shortner_backend` on `http://localhost:5000`
   * `mongoDB-container` on port `27017`
   * `redis-container` on port `6379`

### Option B: Running Locally on Bare Metal
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the root directory:
   ```env
   PORT=5000
   CLIENT_URL=http://localhost:3000
   MONGODB_URI=mongodb://localhost:27017/url_shortener
   REDIS_URL=redis://localhost:6379
   BASE_URL=http://localhost:5000/
   NODE_ENV=development
   ```
3. Start local MongoDB and Redis instances.
4. Run in development mode (with hot reloading via nodemon):
   ```bash
   npm run dev
   ```
5. Run in production mode:
   ```bash
   npm start
   ```

### Running Automated Tests
* Run full test suite with coverage:
  ```bash
  npm test
  ```
* Run linter:
  ```bash
  npm run lint
  ```
* Automatically fix formatting:
  ```bash
  npm run format
  ```

---

## 14. Current State, Gaps, and Risks

### Unfinished Features and Code Gaps
1. **Unused Dependencies and Scaffolded Models:**  
   * `resend` and `nodemailer` are installed in `package.json`, and `src/model/emailservice.model.js` exists, but there is no email-sending logic anywhere in the codebase.
2. **Scaffolded Authentication System:**  
   * `src/model/url.model.js` (line 15) defines `generatedBy: { type: Schema.Types.ObjectId, ref: 'User' }`, but no `User` model exists.
   * `src/util/validation.js` contains commented-out validation functions for `validFullName`, `validEmail`, `validContactNo`, and `validPassword`.
3. **Dead Record Field (`lastClickedAt`):**  
   * `src/controller/urlList.controller.js` queries and returns `lastClickedAt`, but this field is never declared in `src/model/url.model.js` and never written to by `captureAnalytics`. It returns `null` for all records.
4. **Hardcoded Timezone in Analytics:**  
   * `src/service/analyticService.js` (lines 191, 199) hardcodes the timezone offset to Indian Standard Time (`+05:30`). This produces unexpected hourly buckets for users in other timezones.
5. **No URL Modification or Deletion Endpoints:**  
   * There are no endpoints to delete a short URL, deactivate a link on demand, or edit a link's destination.

### Out-of-Scope Items (What the System Does Not Do)
* No frontend user interface.
* No user login, registration, or JWT token verification.
* No custom short code aliases (e.g., `/my-brand-name`).
* No QR code generation.
* No message queuing for analytics ingestion (clicks write directly to MongoDB).

---

## 15. Glossary

* **Base62 Encoding:** A numbering system that represents numbers using 62 characters: numbers (`0-9`), lowercase letters (`a-z`), and uppercase letters (`A-Z`). Used to convert integer counters into short URL strings.
* **BigInt:** A native JavaScript data type used to represent integers larger than $2^{53} - 1$, preventing numeric overflow when the sequence counter grows large.
* **HTTP 307 (Temporary Redirect):** An HTTP redirect status code guaranteeing that the client will not alter the original HTTP request method when following the redirect to the destination URL.
* **TTL (Time to Live):** An automated timer set on a cache key or database document. When the TTL expires, the storage engine automatically removes the record.
* **LRU (Least Recently Used) Eviction:** A cache management policy where the cache discards the least recently accessed items first when memory limits are reached.
* **Faceted Aggregation (`$facet`):** A MongoDB aggregation stage that processes multiple analytics grouping pipelines in parallel over an incoming set of documents in a single database query.
* **Rate Limiting:** A defensive mechanism restricting the number of requests an individual client can send within a specific time window.
* **GeoIP Lookup:** Resolving an incoming network IP address to an approximate geographical location (country, region, city) using a local database.

---

## 16. Open Questions

1. **User Accounts & Link Ownership:**  
   Should user registration and login be implemented using the scaffolded `generatedBy` field, or will this service remain a public, anonymous utility API?
2. **Timezone Support in Trends:**  
   Should the hardcoded `+05:30` IST timezone in `src/service/analyticService.js` be replaced with dynamic timezone parameters from client request queries?
3. **Analytics Ingestion Queueing:**  
   If redirect volume reaches thousands of clicks per second, should we introduce a message broker (e.g., BullMQ with Redis, or Kafka) before writing click events to MongoDB?
4. **Email Notifications:**  
   What was the intended purpose of `emailservice.model.js` and the `resend`/`nodemailer` libraries? Were they intended for weekly click reports or user account verification?
5. **IP Anonymization:**  
   Should raw IP addresses in `src/model/analysis.model.js` be masked or hashed before storage to comply with data privacy regulations (GDPR/CCPA)?

---

## 17. Learning Check (Test Your Understanding)

### Easy
1. **What HTTP status code is used for link redirects, and why?**  
   *Answer:* `307 Temporary Redirect` (`src/controller/url.controller.js`). It ensures the user's browser redirects to the destination without caching the redirection locally (allowing the server to record future clicks) and preserves the request method.
2. **What character set does Base62 encoding use, and how many characters are in it?**  
   *Answer:* 62 characters: `0-9`, `a-z`, and `A-Z` (`src/util/hashGenerator.js`).
3. **What is the default expiration time for a short link if the user does not supply one?**  
   *Answer:* 30 calendar days from the creation date (`src/service/urlService.js`, line 17).
4. **Which caching engine is used, and what eviction policy does it enforce?**  
   *Answer:* Redis, using the `allkeys-lru` eviction policy capped at 256MB (`src/db/redisClient.js`).
5. **What happens if a visitor tries to access a short code that is less than 4 characters long?**  
   *Answer:* The validation check in `src/util/validation.js` fails and throws an `AppError` with status code `406 Not Acceptable`.

### Medium
6. **How does link generation prevent race conditions and duplicate short codes?**  
   *Answer:* It uses MongoDB's atomic `Counter.findOneAndUpdate` operation with `$inc: { counter: 1 }` (`src/service/urlService.js`), guaranteeing that each link gets a unique integer sequence ID.
7. **Why doesn't click analytics capture slow down the user's redirection?**  
   *Answer:* The `captureAnalytics` function is invoked without the `await` keyword in `src/service/urlService.js`. The HTTP 307 redirect returns to the visitor immediately while analytics run asynchronously in the background.
8. **What happens during a redirect if the Redis server crashes?**  
   *Answer:* The Redis read is wrapped in a `try/catch` block in `src/service/urlService.js`. On Redis errors, it logs the failure and falls back to querying MongoDB directly.
9. **How does the system ensure Redis keys expire at the same time as the link's database record?**  
   *Answer:* During cache population, it computes the remaining lifetime of the link and sets Redis TTL to `Math.min(remainingTime, 3600)` seconds (`src/service/urlService.js`).
10. **What is the rate limit for generating CSV analytics reports?**  
    *Answer:* 5 requests per 15 minutes per IP address, enforced by `reportLimiter` in `src/middleware/limiter.middleware.js`.

### Hard
11. **Why does `hashGenerator.js` use `BigInt` instead of standard JavaScript `Number`?**  
    *Answer:* Standard JavaScript numbers lose precision above $2^{53} - 1$ (`Number.MAX_SAFE_INTEGER`). Using `BigInt` ensures the Base62 encoding remains accurate even if the sequence counter grows extremely large.
12. **Why does the redirect service replace IP address `::1` with `47.15.230.222`?**  
    *Answer:* `::1` is the IPv6 localhost loopback address. `geoip-lite` cannot resolve geolocation for loopback addresses, so it is replaced with a public IP for testing (`src/service/urlService.js`, line 66).
13. **How does the single-code analytics cache work with two distinct Redis keys?**  
    *Answer:* It first reads a string key `map:<shortCode>` to find the link's MongoDB `_id`, then reads a Redis hash `stats:<shortURLId>` storing the stringified aggregation facet data (`src/service/analyticService.js`).
14. **Why is the `lastClickedAt` field in the URL listing endpoint always `null`?**  
    *Answer:* While `src/controller/urlList.controller.js` selects and maps `lastClickedAt`, the field is not defined in `src/model/url.model.js` and is never updated in `captureAnalytics`.
15. **What potential database bottleneck exists during high traffic spikes, and how could it be addressed?**  
    *Answer:* Every redirect triggers an immediate direct write to MongoDB for analytics insertion and click incrementing. Under extreme traffic, this can exhaust MongoDB connection pools. This can be resolved by queueing click events through a message broker (e.g., BullMQ/Redis) and batch-writing to MongoDB.
