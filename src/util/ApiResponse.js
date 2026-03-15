export class ApiResponse {
  constructor(statusCode, message = '', data = null, success = true) {
    this.message = message
    this.statusCode = statusCode
    this.success = success
    this.data = data
  }
}
