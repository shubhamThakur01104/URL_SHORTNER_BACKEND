import http from 'k6/http'

import { check, sleep } from 'k6'

export const options = {
  // stages: [
  //     { duration: '30s', target: 500 },  // 0 se 50 users (Ramp-up)
  //     { duration: '1m', target: 500 },   // 50 users lagatar (Steady state)
  //     { duration: '20s', target: 0 },   // Wapas zero (Ramp-down)
  // ],
  thresholds: {
    // Redirection 200ms se slow nahi honi chahiye (kyunki ye fast honi chahiye!)
    http_req_duration: ['p(95)<200'],
  },

  scenarios: {
    unique_users_test: {
      executor: 'per-vu-iterations', // Har user (VU) ko apna task diya jayega
      vus: 1000, // Total 1000 unique users
      iterations: 1, // Har user sirf 1 baar click karega
      maxDuration: '1m', // 1 minute ke andar ye khatam hona chahiye
    },
  },
}

export default function () {
  const SHORT_ID = '6mxGB'
  const BASE_URL = `http://localhost:5000/${SHORT_ID}`

  // Hum GET request bhej rahe hain kyunki user link "kholta" hai
  const res = http.get(BASE_URL, {
    redirects: 0,
  })

  check(res, {
    // Redirection ka status code 301 ya 302 hota hai
    'is redirect (307/302)': (r) => r.status === 307 || r.status === 302,
  })

  // sleep(1)
}
