import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // 100 Admins checking reports
    { duration: '1m', target: 100 }, // Peak time: 100 Admins
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // Dashboards 500ms se slow nahi hone chahiye
  },
}

export default function () {
  const SHORT_CODE = '6mxGB' // Wo code jiske paas dher saara data ho
  const URL = `http://localhost:5000/api/v1/analysis/${SHORT_CODE}`

  const res = http.get(URL)

  check(res, {
    'is status 200': (r) => r.status === 200,
    'has data object': (r) => {
      const body = JSON.parse(r.body)
      return (
        body.success === true &&
        body.data.categorizedByCity !== undefined &&
        Array.isArray(body.data.categorizedByCity)
      )
    },
    'has clicks recorded': (r) => {
      const body = JSON.parse(r.body)
      return body.data.countClickOnEachLink[0].total > 0
    },
  })

  sleep(1)
}
