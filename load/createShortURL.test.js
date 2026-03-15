import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 500 }, // 30s mein 0 se 20 users tak jao (Ramp-up)
    { duration: '1m', target: 500 }, // 1 min tak 20 users bhejte raho (Steady state)
    { duration: '20s', target: 0 }, // 20s mein dheere dheere band karo (Ramp-down)
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% requests 500ms se fast honi chahiye
  },
}

export default function () {
  const BASE_URL = 'http://localhost:5000/api/v1/url/'

  const payload = JSON.stringify({
    orgURL: 'https://www.google.com',
  })

  const params = {
    headers: { 'Content-Type': 'application/json' },
  }

  const res = http.post(`${BASE_URL}`, payload, params)

  check(res, {
    'is status 200': (r) => r.status === 200,
    'is status 429 (Rate Limited)': (r) => r.status === 429,
  })

  sleep(1)
}
