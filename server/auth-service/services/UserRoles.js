// Auth Service - UserRoles.js

const { tblUserRoles, tblAuthentication } = require('../models');

const getUserRoles = async (email) => {
    try {
        const userRoles = await tblUserRoles.findAll({
            // Select only the 'role' column
            attributes: ['role'],
            // Define the INNER JOIN to tblAuthentication
            include: [{
                model: tblAuthentication,
                as: 'uu',          // Use the alias defined in init-models.js
                required: true,   // This makes it an INNER JOIN
                attributes: [],   // We don't need any columns from tblAuthentication itself
                where: {
                    email: email  // Apply the WHERE clause on the joined table
                }
            }]
        });

        // Map the array of objects to an array of integers, e.g., [{role: 1}, {role: 2}] -> [1, 2]
        return userRoles.map(userRole => userRole.role);

    } catch (error) {
        console.error("Error in getUserRoles service:", error);
        throw error;
    }
};

module.exports = {
    getUserRoles,
};
