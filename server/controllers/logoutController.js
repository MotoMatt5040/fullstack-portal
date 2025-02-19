const { getUserByRefreshToken, clearRefreshToken } = require('../models/PromarkUsers');

const handleLogout = async (req, res) => {
    // On client/front end, please also delete the accessToken
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204); // No content
    const refreshToken = cookies.jwt;

    try {
        const foundUser = await getUserByRefreshToken(refreshToken);
        if (!foundUser) {
            res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
            return res.sendStatus(204); // No content
        }

        // Clear the refresh token in the database
        await clearRefreshToken(foundUser.Email);

        res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true }); // secure: true - only serves on https
        res.sendStatus(204); // No content
    } catch (err) {
        console.error('Database query failed:', err);
        res.sendStatus(500); // Internal server error
    }
};

module.exports = { handleLogout };