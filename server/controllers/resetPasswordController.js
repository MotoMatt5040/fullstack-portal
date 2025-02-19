const { getUserByEmail, updateUserPassword, saveResetToken, getUserByResetToken } = require('../models/PromarkUsers');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sql = require('mssql');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER, // This is usually 'apikey' for SendGrid
        pass: process.env.EMAIL_API_KEY
    }
});

const handlePasswordResetRequest = async (req, res) => {
    console.log(req.body);
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ 'message': 'Please include an email' });
    }

    try {
        const existingUser = await getUserByEmail(email);
        if (!existingUser) {
            return res.status(404).json({ 'message': 'User not found' });
        }

        const token = crypto.randomBytes(20).toString('hex');
        const resetLink = `http://localhost:5000/reset-password/${token}`;
        const expires = new Date(Date.now() + 60 * 60 * 1000); // MM * SS * MS 

        // Save the token and expiration time in the database
        await saveResetToken(email, token, expires);

        const mailOptions = {
            to: existingUser.Email,
            from: 'no-reply@promarkresearch.com', 
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
            res.status(200).json({ 'message': 'Password reset email sent' });
        });
    } catch (err) {
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
        const result = await updateUserPassword(existingUser.Email, hashedPwd);

        console.log(result);

        res.status(200).json({ 'success': `Password for user ${existingUser.Email} has been reset` });
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
};

module.exports = { handlePasswordResetRequest, handleResetPassword };