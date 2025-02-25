const User = require('../models/User');

const getAllUsers = async (req, res) => {
    const user = await User.find();
    if (!user) return res.status(204).json({ "message": "No users found."} );
    res.json(user);
}

const deleteUser = async (req, res) => {
    if (!req?.body?.id) return res.status(400).json({ "message": 'User ID required' });
    const user = await User.findOne({_id: req.body.id}).exec();
    if (!user) return res.status(204).json({ "message": `No user matches ID ${req.body.id}`});
    const result = await user.deleteOne({_id: req.body.id}); // exec is not needed here
    res.json(result);
}

const getUser = async (req, res) => {
    if (!req?.params?.id) return res.status(400).json({ "message": 'User ID required' });
    const user = await User.findOne({_id: req.params.id}).exec();
    if (!user) return res.status(204).json({ "message": `No user matches ID ${req.body.id}`});
    res.json(user);
}

module.exports = {
    getAllUsers,
    deleteUser,
    getUser
}