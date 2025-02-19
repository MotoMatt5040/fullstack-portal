const { getAllUsers, getUserByEmail, updateUserPassword, saveResetToken, getUserByResetToken, createUser } = require('../models/PromarkUsers');
const bcrypt = require('bcrypt');

const handleGetAllUsers = async (req, res) => {
    try {
        const users = await getAllUsers();
        res.status(200).json(users);
    } catch (err) {
        console.error('Database query failed:', err);
        res.status(500).json({ message: 'Database query failed' });
    }
};

const handleGetUserById = async (req, res) => {
    try {
        const user = await getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (err) {
        console.error('Database query failed:', err);
        res.status(500).json({ message: 'Database query failed' });
    }
};

const handleGetUserByEmail = async (req, res) => {
    const { email } = req.params;
    if (!email) {
        return res.status(400).json({ message: 'Please include an email' });
    }

    try {
        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (err) {
        console.error('Database query failed:', err);
        res.status(500).json({ message: 'Database query failed' });
    }
};

const handleCreateUser = async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'Please include all required fields' });
    }

    try {
        const hashedPwd = await bcrypt.hash(password, 10);
        const result = await createUser(email, hashedPwd, firstName, lastName);
        res.status(201).json({ success: `User ${email} created successfully` });
    } catch (err) {
        console.error('Database query failed:', err);
        res.status(500).json({ message: 'Database query failed' });
    }
};

const handleUpdateUserPassword = async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
        return res.status(400).json({ message: 'Please include email and new password' });
    }

    try {
        const hashedPwd = await bcrypt.hash(newPassword, 10);
        const result = await updateUserPassword(email, hashedPwd);
        res.status(200).json({ success: `Password for user ${email} updated successfully` });
    } catch (err) {
        console.error('Database query failed:', err);
        res.status(500).json({ message: 'Database query failed' });
    }
};

const handleSaveResetToken = async (req, res) => {
    const { email, token, expires } = req.body;
    if (!email || !token || !expires) {
        return res.status(400).json({ message: 'Please include email, token, and expiration time' });
    }

    try {
        const result = await saveResetToken(email, token, expires);
        res.status(200).json({ success: `Reset token for user ${email} saved successfully` });
    } catch (err) {
        console.error('Database query failed:', err);
        res.status(500).json({ message: 'Database query failed' });
    }
};

const handleGetUserByResetToken = async (req, res) => {
    const { token } = req.params;
    if (!token) {
        return res.status(400).json({ message: 'Please include a token' });
    }

    try {
        const user = await getUserByResetToken(token);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (err) {
        console.error('Database query failed:', err);
        res.status(500).json({ message: 'Database query failed' });
    }
};

module.exports = {
    handleGetAllUsers,
    handleGetUserById,
    handleGetUserByEmail,
    handleCreateUser,
    handleUpdateUserPassword,
    handleSaveResetToken,
    handleGetUserByResetToken
};