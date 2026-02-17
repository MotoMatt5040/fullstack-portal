// Monolith - PromarkUsers.js
// This service provides user validation for JWT middleware

const { Authentication } = require('../models');

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
    validateDeviceId,
};
