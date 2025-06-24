const verifyRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // --- Start of Logging ---
        console.log(`--- [verifyRoles] Checking authorization for: ${req.method} ${req.originalUrl} ---`);
        
        // Log what the route requires. Example: [1]
        console.log('[verifyRoles] Roles required by this route:', allowedRoles);
        
        // Log what was attached to the request from the JWT. Example: [1, 2, 7]
        console.log('[verifyRoles] Roles found on request from JWT:', req.roles);
        // --- End of Logging ---

        // Check if the roles array from the JWT even exists.
        if (!req?.roles) {
            console.log('[verifyRoles] ❌ FAILED: No roles array was found on the request object.');
            return res.sendStatus(401); // Unauthorized
        }
        
        // The core logic to find a match
        const result = req.roles
            .map(role => allowedRoles.includes(role))
            .find(isMatch => isMatch === true);

        // Log the result of the comparison
        console.log('[verifyRoles] Authorization check result (true means a match was found):', result);

        if (result) {
            // If a match was found, result will be `true`.
            console.log('[verifyRoles] ✅ SUCCESS: User has a required role. Allowing access to controller.');
            next(); // User has permission, proceed.
        } else {
            // If no match was found, result will be `undefined`.
            console.log('[verifyRoles] ❌ FAILED: User roles do not include any of the required roles.');
            res.sendStatus(401); // Unauthorized
        }
    };
};

module.exports = verifyRoles;