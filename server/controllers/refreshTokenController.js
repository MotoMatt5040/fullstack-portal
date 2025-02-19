const { getUserByRefreshToken } = require('../models/PromarkUsers');
const jwt = require('jsonwebtoken');

const handleRefreshToken = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(401);
    const refreshToken = cookies.jwt;

    try {
        const foundUser = await getUserByRefreshToken(refreshToken);
        if (!foundUser) return res.sendStatus(403);

        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET,
            (err, decoded) => {
                if (err || foundUser.Email !== decoded.username) return res.sendStatus(403);
                const roles = Object.values(foundUser.roles);
                const accessToken = jwt.sign(
                    { 
                        "UserInfo": {
                            "username": decoded.username,
                            "roles": roles
                        }
                    },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: '15m' } // refresh access token timer
                );
                res.json({ accessToken }); // roles are being sent in the access token above
            }
        );
    } catch (err) {
        console.error('Database query failed:', err);
        res.sendStatus(500);
    }
};

module.exports = { handleRefreshToken };