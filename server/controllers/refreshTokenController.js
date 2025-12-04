// server/controllers/refreshTokenController.js
const { getUserByRefreshToken, updateUserRefreshToken } = require('../services/PromarkUsers');
const { getUserRoles } = require('../services/UserRoles');
const jwt = require('jsonwebtoken');

const handleRefreshToken = async (req, res) => {
    const cookies = req.cookies;

    // No refresh token cookie - user needs to login
    if (!cookies?.jwt) {
        return res.status(401).json({ message: 'No refresh token' });
    }

    const refreshToken = cookies.jwt;

    try {
        // Check if refresh token exists in database
        const foundUser = await getUserByRefreshToken(refreshToken);

        // Token not in DB - possibly revoked or tampered
        if (!foundUser) {
            // Clear the invalid cookie
            res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

        // Get user roles
        const roles = await getUserRoles(foundUser.Email);

        // Verify the refresh token signature
        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET,
            async (err, decoded) => {
                // Token expired or invalid signature
                if (err) {
                    console.log('Refresh token verification failed:', err.message);
                    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
                    return res.status(403).json({ message: 'Refresh token expired' });
                }

                // Token doesn't match the user
                if (foundUser.Email !== decoded.username) {
                    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
                    return res.status(403).json({ message: 'Token mismatch' });
                }

                // Generate new access token
                const accessToken = jwt.sign(
                    {
                        "UserInfo": {
                            "username": foundUser.Email,
                            "roles": roles
                        }
                    },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: '15m' }
                );

                // Refresh token rotation - generate new refresh token for better security
                const newRefreshToken = jwt.sign(
                    { "username": foundUser.Email },
                    process.env.REFRESH_TOKEN_SECRET,
                    { expiresIn: '24h' }
                );

                // Update refresh token in database
                await updateUserRefreshToken(foundUser.Email, newRefreshToken, accessToken);

                // Set new refresh token cookie
                res.cookie('jwt', newRefreshToken, {
                    httpOnly: true,
                    sameSite: 'None',
                    secure: true,
                    maxAge: 24 * 60 * 60 * 1000
                });

                res.json({ accessToken });
            }
        );
    } catch (err) {
        console.error('Refresh token error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { handleRefreshToken };
