// @internal/cors-config - Shared CORS configuration

const allowedOrigins = [
  'https://www.promarkresearch.com',
  'http://localhost:3000',
  'https://localhost:3000',
  'http://localhost:5173',
  'https://localhost',
  'https://api.dashboard.promarkresearch.com',
  'https://dashboard.promarkresearch.com',
  'https://portaldevelopment1.promarkresearch.com',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

/**
 * Credentials middleware - sets Access-Control-Allow-Credentials header
 */
const credentials = (req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Credentials', true);
  }
  next();
};

module.exports = {
  allowedOrigins,
  corsOptions,
  credentials,
};
