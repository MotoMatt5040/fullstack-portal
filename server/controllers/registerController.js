const User = require('../models/User');
const bcrypt = require('bcrypt');

const handleNewUser = async (req, res) => {
    const { user, pwd } = req.body;
    if (!user || !pwd) {
        return res.status(400).json({ 'message': 'Please include a username and password' });
    }
    const duplicate = await User.findOne({ username: user}).exec(); // need exec() when using async/await
    if (duplicate) {
        return res.status(409).json({ 'message': 'Username already exists' });
    }
    try {
        const hashedPwd = await bcrypt.hash(pwd, 10);

        // create and store new user
        const result = await User.create({ 
            "username": user, 
            "password": hashedPwd
        });

        // alternative way to create and store new user
        // const newUser = new User();
        // newUser.username = ...
        // const result = await newUser.save()

        // alternative way to create and store new user
        // const newUser = new User({
        //     "username": user,
        //     "password": hashedPwd
        // })
        // const result = await newUser.save()

        console.log(result);

        res.status(201).json({ 'success': `New user ${user} created` });
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
}

module.exports = { handleNewUser }
