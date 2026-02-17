// Auth Service - PromarkUsers.js

const { Authentication } = require('../models');
const { Sequelize } = require('sequelize');

const getUserByEmail = async (email) => {
    try {
        const user = await Authentication.findOne({ where: { Email: email } });
        return user;
    } catch (error) {
        console.error("Error in getUserByEmail:", error);
        throw error;
    }
};

const updateUserPassword = async (email, hashedPwd) => {
    try {
        const [affectedRows] = await Authentication.update({
            Password: hashedPwd,
            ResetPasswordToken: null,
            ResetPasswordExpires: null,
            DateUpdated: Sequelize.literal('GETDATE()')
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
        const [affectedRows] = await Authentication.update({
            ResetPasswordToken: token,
            ResetPasswordExpires: expires,
            DateUpdated: Sequelize.literal('GETDATE()')
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
        const user = await Authentication.findOne({ where: { ResetPasswordToken: token } });
        return user;
    } catch (error) {
        console.error("Error in getUserByResetToken:", error);
        throw error;
    }
};

const getUserByRefreshToken = async (refreshToken) => {
    try {
        const user = await Authentication.findOne({ where: { RefreshToken: refreshToken } });
        return user;
    } catch (error) {
        console.error("Error in getUserByRefreshToken:", error);
        throw error;
    }
};

const clearRefreshToken = async (email) => {
    try {
        const [affectedRows] = await Authentication.update({
            RefreshToken: null,
            AccessToken: null,
            DateUpdated: Sequelize.literal('GETDATE()')
        }, {
            where: { Email: email }
        });
        return affectedRows;
    } catch (error) {
        console.error("Error in clearRefreshToken:", error);
        throw error;
    }
};

const updateUserRefreshToken = async (email, refreshToken, accessToken, deviceId = null) => {
    try {
        const updateData = {
            RefreshToken: refreshToken,
            AccessToken: accessToken,
            DateUpdated: Sequelize.literal('GETDATE()')
        };

        // Only update DeviceId if provided
        if (deviceId) {
            updateData.DeviceId = deviceId;
        }

        const [affectedRows] = await Authentication.update(updateData, {
            where: { Email: email }
        });
        return affectedRows;
    } catch (error) {
        console.error("Error in updateUserRefreshToken:", error);
        throw error;
    }
};

const validateDeviceId = async (email, deviceId) => {
    try {
        const user = await Authentication.findOne({
            where: { Email: email },
            attributes: ['DeviceId']
        });
        // If no DeviceId stored yet, allow (backwards compatibility)
        if (!user || !user.DeviceId) {
            return true;
        }
        return user.DeviceId === deviceId;
    } catch (error) {
        console.error("Error in validateDeviceId:", error);
        throw error;
    }
};

module.exports = {
    getUserByEmail,
    updateUserPassword,
    saveResetToken,
    getUserByResetToken,
    getUserByRefreshToken,
    clearRefreshToken,
    updateUserRefreshToken,
    validateDeviceId,
};
