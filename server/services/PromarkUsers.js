// server/services/PromarkUsers.js

const { tblAuthentication } = require('../models');
const { Sequelize } = require('sequelize'); 

const getUserByEmail = async (email) => {
    try {
        const user = await tblAuthentication.findOne({ where: { Email: email } });
        return user;
    } catch (error) {
        console.error("Error in getUserByEmail:", error);
        throw error;
    }
};

const updateUserPassword = async (email, hashedPwd) => {
    try {
        const [affectedRows] = await tblAuthentication.update({
            Password: hashedPwd,
            DateUpdated: Sequelize.literal('GETDATE()') // <-- FIX
        }, {
            where: { Email: email }
        });
        return affectedRows;
    } catch (error) {
        console.error("Error in updateUserPassword:", error);
        throw error;
    }
};

const saveResetToken = async (email, token, expires) => {
    try {
        const [affectedRows] = await tblAuthentication.update({
            ResetPasswordToken: token,
            ResetPasswordExpires: expires,
            DateUpdated: Sequelize.literal('GETDATE()') // <-- FIX
        }, {
            where: { Email: email }
        });
        return affectedRows;
    } catch (error) {
        console.error("Error in saveResetToken:", error);
        throw error;
    }
};

const getUserByResetToken = async (token) => {
    try {
        const user = await tblAuthentication.findOne({ where: { ResetPasswordToken: token } });
        return user;
    } catch (error) {
        console.error("Error in getUserByResetToken:", error);
        throw error;
    }
};

const createInternalUser = async (email, hashedPwd) => {
    try {
        // The 'create' method doesn't need the fix if the database columns
        // have GETDATE() as their default value, which is common.
        const newUser = await tblAuthentication.create({
            Email: email,
            Password: hashedPwd
        });
        return newUser;
    } catch (error) {
        console.error('Error in createInternalUser:', error);
        throw error;
    }
};

const getUserByRefreshToken = async (refreshToken) => {
    try {
        const user = await tblAuthentication.findOne({ where: { RefreshToken: refreshToken } });
        return user;
    } catch (error) {
        console.error("Error in getUserByRefreshToken:", error);
        throw error;
    }
};

const clearRefreshToken = async (email) => {
    try {
        const [affectedRows] = await tblAuthentication.update({
            RefreshToken: null,
            AccessToken: null,
            DateUpdated: Sequelize.literal('GETDATE()') // <-- FIX
        }, {
            where: { Email: email }
        });
        return affectedRows;
    } catch (error) {
        console.error("Error in clearRefreshToken:", error);
        throw error;
    }
};

const updateUserRefreshToken = async (email, refreshToken, accessToken) => {
    try {
        const [affectedRows] = await tblAuthentication.update({
            RefreshToken: refreshToken,
            AccessToken: accessToken,
            DateUpdated: Sequelize.literal('GETDATE()') // <-- FIX
        }, {
            where: { Email: email }
        });
        return affectedRows;
    } catch (error) {
        console.error("Error in updateUserRefreshToken:", error);
        throw error;
    }
};

const getAllUsers = async () => {
    try {
        const users = await tblAuthentication.findAll({ attributes: ['Email'] });
        return users;
    } catch (error) {
        console.error("Error in getAllUsers:", error);
        throw error;
    }
};

const validateAccessToken = async (email, accessToken) => {
    try {
        const user = await tblAuthentication.findOne({
            where: { Email: email },
            attributes: ['AccessToken']
        });
        if (!user || !user.AccessToken) {
            return false;
        }
        return user.AccessToken === accessToken;
    } catch (error) {
        console.error("Error in validateAccessToken:", error);
        throw error;
    }
};

module.exports = {
    getUserByEmail,
    updateUserPassword,
    saveResetToken,
    getUserByResetToken,
    createInternalUser,
    getUserByRefreshToken,
    clearRefreshToken,
    updateUserRefreshToken,
    getAllUsers,
    validateAccessToken,
};