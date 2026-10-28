function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate record conflict";
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for "${err.path}"`;
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: message,
    ...(err.details || {}),
  });
}

module.exports = { errorHandler };
