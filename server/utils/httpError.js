/**
 * Creates an Error carrying an HTTP status code (and optional extra JSON fields)
 * that the centralized error middleware turns into a proper API response.
 */
function httpError(statusCode, message, details) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (details) err.details = details;
  return err;
}

module.exports = { httpError };
