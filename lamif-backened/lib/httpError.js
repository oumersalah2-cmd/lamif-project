// Throw one of these from a route and the error handler turns it into a JSON response
class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

module.exports = (status, message) => new HttpError(status, message)
