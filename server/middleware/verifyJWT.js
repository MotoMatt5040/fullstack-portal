const jwt = require('jsonwebtoken');

const verifyJWT = (req, res, next) => {
  // Log the incoming request to see which one is being processed
  console.log(
    `--- [verifyJWT] Checking token for: ${req.method} ${req.originalUrl} ---`
  );

  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    // Log the failure reason
    console.log(
      '[verifyJWT] ❌ FAILED: Request is missing the "Bearer " token.'
    );
    return res.status(401).json({ message: 'Not authorized' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // Log the specific verification error (e.g., "jwt expired")
      console.log(
        '[verifyJWT] ❌ FAILED: Token verification error.',
        err.message
      );
      return res.status(403).json({ message: 'Forbidden' });
    }

    // --- These are the most important logs ---
    console.log('[verifyJWT] ✅ Token is valid. Decoded payload:', decoded);

    // Assign user info to the request object
    req.user = decoded.UserInfo.username;
    req.roles = decoded.UserInfo.roles;

    console.log('[verifyJWT] ✅ Attaching roles to request object:', req.roles);
    // ----------------------------------------

    next(); // Proceed to the next middleware (verifyRoles)
  });
};

module.exports = verifyJWT;
