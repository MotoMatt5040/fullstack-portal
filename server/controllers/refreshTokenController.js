const { getUserByRefreshToken } = require('../models/PromarkUsers');
const { getUserRoles } = require('../models/UserRoles');
const jwt = require('jsonwebtoken');

const handleRefreshToken = async (req, res) => {
    const cookies = req.cookies;
    if (cookies?.persist !== 'true') return res.sendStatus(200); 
    if (!cookies?.jwt) return res.sendStatus(401);
    const refreshToken = cookies.jwt;

    try {
        const foundUser = await getUserByRefreshToken(refreshToken);
        if (!foundUser) return res.sendStatus(403);
        const roles = await getUserRoles(foundUser.Email);

        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET,
            (err, decoded) => {
                if (err || foundUser.Email !== decoded.username) return res.sendStatus(403);
                const accessToken = jwt.sign(
                    { 
                        "UserInfo": {
                            "username": foundUser.Email,
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