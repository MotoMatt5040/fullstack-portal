const promarkUsers = require('../models/PromarkUsers');
const bcrypt = require('bcrypt');

const handleAsync = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (err) {
        console.error('Database query failed:', err);
        res.status(500).json({ message: 'Database query failed' });
    }
};

const handleGetAllUsers = handleAsync(async (req, res) => {
    const users = await promarkUsers.getAllUsers();
    res.status(200).json(users);
});

const handleGetUserById = handleAsync(async (req, res) => {
    const user = await promarkUsers.getUserById(req.params.id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
});

const handleGetUserByEmail = handleAsync(async (req, res) => {
    const { email } = req.params;
    if (!email) {
        return res.status(400).json({ message: 'Please include an email' });
    }

    const user = await promarkUsers.getUserByEmail(email);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
});

const handleCreateUser = handleAsync(async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'Please include all required fields' });
    }

    const hashedPwd = await bcrypt.hash(password, 10);
    await promarkUsers.createUser(email, hashedPwd, firstName, lastName);
    res.status(201).json({ success: `User ${email} created successfully` });
});

const handleUpdateUserPassword = handleAsync(async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
        return res.status(400).json({ message: 'Please include email and new password' });
    }

    const hashedPwd = await bcrypt.hash(newPassword, 10);
    await promarkUsers.updateUserPassword(email, hashedPwd);
    res.status(200).json({ success: `Password for user ${email} updated successfully` });
});

const handleSaveResetToken = handleAsync(async (req, res) => {
    const { email, token, expires } = req.body;
    if (!email || !token || !expires) {
        return res.status(400).json({ message: 'Please include email, token, and expiration time' });
    }

    await promarkUsers.saveResetToken(email, token, expires);
    res.status(200).json({ success: `Reset token for user ${email} saved successfully` });
});

const handleGetUserByResetToken = handleAsync(async (req, res) => {
    const { token } = req.params;
    if (!token) {
        return res.status(400).json({ message: 'Please include a token' });
    }

    const user = await promarkUsers.getUserByResetToken(token);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
});

const handleAddUserRoles = handleAsync(async (req, res) => {
    const { email, roles } = req.body;
    if (!email || !roles) {
        return res.status(400).json({ message: 'Please include email and roles' });
    }

    await promarkUsers.addUserRoles(email, roles);
    res.status(200).json({ success: `Roles added to user ${email} successfully` });
});

const handleRemoveUserRoles = handleAsync(async (req, res) => {
    const { email, roles } = req.body;
    if (!email || !roles) {
        return res.status(400).json({ message: 'Please include email and roles' });
    }

    await promarkUsers.removeUserRoles(email, roles);
    res.status(200).json({ success: `Roles added to user ${email} successfully` });
});

module.exports = {
    handleGetAllUsers,
    handleGetUserById,
    handleGetUserByEmail,
    handleCreateUser,
    handleUpdateUserPassword,
    handleSaveResetToken,
    handleGetUserByResetToken,
    handleAddUserRoles,
    handleRemoveUserRoles
};