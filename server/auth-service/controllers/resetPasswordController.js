// Auth Service - resetPasswordController.js
const { getUserByEmail, updateUserPassword, saveResetToken, getUserByResetToken } = require('../services/PromarkUsers');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { resetPasswordEmail } = require('@internal/email-templates');

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
        const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

        // Save the token and expiration time in the database
        await saveResetToken(email, token, expires);

        const { subject, html, text } = resetPasswordEmail(email, token);

        const mailOptions = {
            to: existingUser.Email,
            from: process.env.FROM_EMAIL || 'no-reply@promarkresearch.com',
            subject,
            html,
            text,
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

const handleVerifyResetToken = async (req, res) => {
    const { token, email } = req.query;
    if (!token || !email) {
        return res.status(400).json({ valid: false, message: 'Token and email are required' });
    }

    try {
        const existingUser = await getUserByResetToken(token);
        if (!existingUser) {
            return res.status(200).json({ valid: false, message: 'Invalid reset token' });
        }

        // Check if token matches the email
        if (existingUser.Email.toLowerCase() !== email.toLowerCase()) {
            return res.status(200).json({ valid: false, message: 'Invalid reset token' });
        }

        // Check if token has expired
        const expiresDate = new Date(existingUser.ResetPasswordExpires);
        if (expiresDate < new Date()) {
            return res.status(200).json({ valid: false, message: 'Reset token has expired' });
        }

        res.status(200).json({ valid: true, email: existingUser.Email });
    } catch (err) {
        console.error('Verify reset token error:', err);
        res.status(500).json({ valid: false, message: err.message });
    }
};

const handleResetPassword = async (req, res) => {
    const { token, newPassword, newPwd } = req.body;
    const password = newPassword || newPwd;
    if (!token) {
        return res.status(400).json({ 'message': 'Invalid reset link' });
    }
    if (!password) {
        return res.status(400).json({ 'message': 'Please enter a new password' });
    }

    try {
        const existingUser = await getUserByResetToken(token);
        if (!existingUser || new Date(existingUser.ResetPasswordExpires) < new Date()) {
            return res.status(400).json({ 'message': 'Token is invalid or has expired' });
        }

        const hashedPwd = await bcrypt.hash(password, 10);

        // Update user password and clear the reset token and expiration time
        await updateUserPassword(existingUser.Email, hashedPwd);

        res.status(200).json({ 'success': `Password has been reset successfully` });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ 'message': err.message });
    }
};

module.exports = { handlePasswordResetRequest, handleVerifyResetToken, handleResetPassword };
