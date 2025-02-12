const User = require('../models/User');

const handleLogout = async (req, res) => {
    //On client/front end, please also delete the accessToken
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204);
    const refreshToken = cookies.jwt;

    const foundUser = await User.findOne({ refreshToken }).exec();
    if (!foundUser) {
        res/clearCookie('jwt', { httpOnly: true });
        return res.sendStatus(204);
    }
    foundUser.refreshToken = '';
    const result = await foundUser.save();
    console.log(result);

    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true }); // secure: true - only serves on https - sameSite and secure MUST both be set for cors to work the SAME options must be set when DELETING a cookie
    res.sendStatus(204);
}

module.exports = { handleLogout }