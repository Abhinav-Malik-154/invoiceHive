export const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err.message);

  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: "Duplicate payment record" });
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Something went wrong" : err.message,
  });
};

export const notFound = (req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });