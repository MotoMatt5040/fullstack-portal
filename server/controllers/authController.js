const { getUserByEmail, updateUserRefreshToken, getUserByRefreshToken, clearRefreshToken } = require('../models/PromarkUsers');
const { getUserRoles } = require('../models/UserRoles');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const handleLogin = async (req, res) => {
    const { user, pwd } = req.body;
    if (!user || !pwd) {
        return res.status(400).json({ 'message': 'Please include a username and password' });
    }

    try {
        const foundUser = await getUserByEmail(user);
        if (!foundUser) {
            return res.status(401).json({ 'message': 'Invalid username or password' });
        }

        const match = await bcrypt.compare(pwd, foundUser.Password);

        if (match) {
            const roles = await getUserRoles(foundUser.Email);
            // Create JWTs here
            const accessToken = jwt.sign(
                { 
                    "UserInfo": {
                        "username": foundUser.Email,
                        "roles": roles
                    }
                }, 
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '15m' } // 15 minutes for prod
            );
            const refreshToken = jwt.sign(
                { "username": foundUser.Email }, 
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '12h' } // 12 Hours for production
            );

            // Update the refresh token in the database
            await updateUserRefreshToken(foundUser.Email, refreshToken, accessToken);

            res.cookie('jwt', refreshToken, { httpOnly: true, sameSite: 'None', secure: true, maxAge: 24 * 60 * 60 * 1000 }); // set to 1 day for now... sameSite and secure MUST both be set for cors to work the SAME options must be set when DELETING a cookie/ secure: true doesnt work with thunderclient but must be there for production
            res.status(200).json({ accessToken }); // Please note - roles are being sent in the access token above.
        } else {
            res.sendStatus(401);
        }
    } catch (err) {
        console.error('Database query failed:', err);
        res.sendStatus(500); // Internal server error
    }
};

const handleLogout = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204); // No content
    const refreshToken = cookies.jwt;
    console.log(refreshToken);
    // Clear the cookie
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
    // Check if refresh token is in db
    const foundUser = await getUserByRefreshToken(refreshToken);
    if (!foundUser) {
        return res.sendStatus(204); // No content
    }
    // Clear the refresh token in db
    await clearRefreshToken(foundUser.Email);
    res.sendStatus(204); // No content
};

module.exports = { handleLogin, handleLogout };

// !!! IMPORTANT NOTE !!! if you use fetch on the front end you must include credentials: 'include' in the options object. Axios just uses the withCredentials flag. You WILL be blocked by cors.