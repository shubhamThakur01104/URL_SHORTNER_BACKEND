# URL Shortener API

A Node.js Express API for shortening URLs with analytics and redirection features.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Technologies Used](#technologies-used)

## Features

- Shorten long URLs to compact short codes
- Redirect short URLs to original URLs
- Analytics for URL clicks (geolocation, device info, etc.)
- Rate limiting for API protection
- CSV report generation for analytics
- MongoDB for data storage
- Redis for caching
- Docker support

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd URL_SHORTNER
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables (see [Environment Variables](#environment-variables))

4. Start MongoDB and Redis services

5. Run the application:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

- `PORT`: Server port (default: 5000)
- `CLIENT_URL`: Frontend client URL for CORS
- `MONGODB_URI`: MongoDB connection string
- `REDIS_URL`: Redis connection URL
- `BASE_URL`: Base URL for short URLs (e.g., http://localhost:5000)
- `NODE_ENV`: Environment (development/production/test)

## API Endpoints

### URL Management

#### 1. Create Short URL

- **Method**: `POST`
- **URL**: `/api/v1/url/`
- **Description**: Creates a short URL from a long URL
- **Rate Limited**: Yes (createLimiter)
- **Input**:
  ```json
  {
    "orgURL": "https://example.com/long-url",
    "expiresAt": "2024-12-31T23:59:59.000Z" // Optional, defaults to 30 days from now
  }
  ```
- **Output**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Short URL Generated Successfully.",
    "data": "http://localhost:5000/abc123"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Invalid URL or bad request
  - `429`: Rate limit exceeded
  - `500`: Internal server error

#### 2. Get All URLs

- **Method**: `GET`
- **URL**: `/api/v1/url/`
- **Description**: Retrieves all active short URLs
- **Rate Limited**: Yes (redirectLimiter)
- **Input**: None
- **Output**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "URLs fetched successfully",
    "data": [
      {
        "_id": "...",
        "originalUrl": "https://example.com",
        "shortCode": "abc123",
        "shortUrl": "http://localhost:5000/abc123",
        "clickCount": 5,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "lastClickedAt": "2024-01-02T00:00:00.000Z"
      }
    ]
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `429`: Rate limit exceeded
  - `500`: Internal server error

#### 3. Redirect Short URL

- **Method**: `GET`
- **URL**: `/:shortCode`
- **Description**: Redirects to the original URL
- **Rate Limited**: Yes (redirectLimiter)
- **Input**:
  - Path parameter: `shortCode` (string)
- **Output**: HTTP redirect to original URL
- **Status Codes**:
  - `307`: Temporary redirect (success)
  - `404`: Short code not found
  - `410`: URL expired
  - `429`: Rate limit exceeded
  - `500`: Internal server error

### Analytics

#### 4. Get All Analytics Details

- **Method**: `GET`
- **URL**: `/api/v1/analysis/`
- **Description**: Retrieves overall analytics data
- **Rate Limited**: Yes (redirectLimiter)
- **Input**: None
- **Output**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Everything is working",
    "data": {
      // Analytics data structure
    }
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `429`: Rate limit exceeded
  - `500`: Internal server error

#### 5. Get Specific Short Code Analytics

- **Method**: `GET`
- **URL**: `/api/v1/analysis/:shortCode`
- **Description**: Retrieves analytics for a specific short URL
- **Rate Limited**: No
- **Input**:
  - Path parameter: `shortCode` (string)
- **Output**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Everything is working",
    "data": {
      // Specific analytics data
    }
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `404`: Short code not found
  - `500`: Internal server error

#### 6. Get URL Analytics Trend

- **Method**: `GET`
- **URL**: `/api/v1/analysis/:shortCode/trend`
- **Description**: Retrieves trend data for URL analytics
- **Rate Limited**: Yes (redirectLimiter)
- **Input**:
  - Path parameter: `shortCode` (string)
- **Output**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Everything is working",
    "data": {
      // Trend data
    }
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `404`: Short code not found
  - `429`: Rate limit exceeded
  - `500`: Internal server error

#### 7. Generate Analytics Report

- **Method**: `GET`
- **URL**: `/api/v1/analysis/:shortCode/generateReport`
- **Description**: Downloads a CSV report of analytics data
- **Rate Limited**: Yes (reportLimiter)
- **Input**:
  - Path parameter: `shortCode` (string)
- **Output**: CSV file download
- **Status Codes**:
  - `200`: Success (file download)
  - `404`: Short code not found
  - `429`: Rate limit exceeded
  - `500`: Internal server error

## Running the Application

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Docker

```bash
docker-compose up
```

## Testing

Run tests:

```bash
npm test
```

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB, Redis
- **Validation**: Zod
- **Rate Limiting**: express-rate-limit, rate-limit-redis
- **Logging**: Pino
- **Security**: Helmet, CORS
- **Testing**: Jest, Babel
- **Containerization**: Docker, Docker Compose
- **Other**: GeoIP, UA Parser, JSON2CSV

## Error Handling

The API uses consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Custom errors may include additional status codes based on the operation.
