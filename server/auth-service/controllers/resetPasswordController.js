// Auth Service - resetPasswordController.js
const { getUserByEmail, updateUserPassword, saveResetToken, getUserByResetToken } = require('../services/PromarkUsers');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const handlePasswordResetRequest = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ 'message': 'Please include an email' });
    }

    try {
        const existingUser = await getUserByEmail(email);
        if (!existingUser) {
            // Don't reveal if user exists or not for security
            return res.status(200).json({ 'message': 'If an account with that email exists, a password reset link has been sent.' });
        }

        const token = crypto.randomBytes(20).toString('hex');
        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Save the token and expiration time in the database
        await saveResetToken(email, token, expires);

        const mailOptions = {
            to: existingUser.Email,
            from: process.env.FROM_EMAIL || 'no-reply@promarkresearch.com',
            subject: 'Password Reset',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
                  `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
                  `${resetLink}\n\n` +
                  `If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ 'message': 'Error sending email' });
            }
            console.log('Email sent:', info.response);
            res.status(200).json({ 'message': 'If an account with that email exists, a password reset link has been sent.' });
        });
    } catch (err) {
        console.error('Password reset request error:', err);
        res.status(500).json({ 'message': err.message });
    }
};

const handleResetPassword = async (req, res) => {
    const { token, newPwd } = req.body;
    if (!token || !newPwd) {
        return res.status(400).json({ 'message': 'Please include a token and new password' });
    }

    try {
        const existingUser = await getUserByResetToken(token);
        if (!existingUser || existingUser.resetPasswordExpires < new Date()) {
            return res.status(400).json({ 'message': 'Token is invalid or has expired' });
        }

        const hashedPwd = await bcrypt.hash(newPwd, 10);

        // Update user password and clear the reset token and expiration time
        await updateUserPassword(existingUser.Email, hashedPwd);

        res.status(200).json({ 'success': `Password has been reset successfully` });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ 'message': err.message });
    }
};

module.exports = { handlePasswordResetRequest, handleResetPassword };
