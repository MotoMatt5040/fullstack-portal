const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const handleLogin = async (req, res) => {
    const { user, pwd } = req.body;
    if (!user || !pwd) {
        return res.status(400).json({ 'message': 'Please include a username and password' });
    }
    const foundUser = await User.findOne({ username: user}).exec(); // need exec() when using async/await
    if (!foundUser) {
        return res.status(401).json({ 'message': 'Invalid username or password' });
    }
    const match = await bcrypt.compare(pwd, foundUser.password);
    if (match) {
        const roles = Object.values(foundUser.roles).filter(Boolean);
        //create JWTs here
        const accessToken = jwt.sign(
            { 
                "UserInfo": {
                    "username": foundUser.username,
                    "roles": roles
                }
            }, 
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m'} //15 minutes for prod
        );
        const refreshToken = jwt.sign(
            { "username": foundUser.username }, 
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '1d'} //30 days for prod
        );
        foundUser.refreshToken = refreshToken;
        const result = await foundUser.save();
        console.log(result);
        res.cookie('jwt', refreshToken, { httpOnly: true, sameSite: 'None', secure: true, maxAge: 24 * 60 * 60 * 1000 }); // set to 1 day for now... sameSite and secure MUST both be set for cors to work the SAME options must be set when DELETING a cookie/ secure: true doesnt work with thunderclient but must be there for production
        res.status(200).json({ accessToken }); // Please note - roles are being sent in the access token above.
    } else {
        res.sendStatus(401);
    }
}

module.exports = { handleLogin }

// !!! IMPORTANT NOTE !!! if you use fetch on the front end you must incluse credentials: 'include' in the options object. Axios just uses the withCredentials flag. You WILL be blocked by cors.