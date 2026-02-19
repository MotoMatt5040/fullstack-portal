const User = require('../services/UserServices');
const { handleAsync } = require('@internal/auth-middleware');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { welcomeEmail, forgotPasswordEmail } = require('@internal/email-templates');

// Email configuration with fallbacks and validation
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
};

// Validate email configuration on startup
if (!emailConfig.auth.user || !emailConfig.auth.pass) {
  console.error(
    'User Management Service: Email configuration error - SMTP_USER and SMTP_PASS must be set'
  );
}

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Password generation function
const generateSecurePassword = (length = 12) => {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  // Ensure at least one of each type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

// Generate secure token for password reset
const generatePasswordResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send email function with better error handling
const sendWelcomeEmail = async (
  email,
  password,
  resetToken,
  isExternal = false,
  clientName = ''
) => {
  try {
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      throw new Error(
        'Email credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.'
      );
    }

    await transporter.verify();
    console.log('SMTP connection verified successfully');

    const { subject, html, text } = welcomeEmail(
      email,
      password,
      resetToken,
      isExternal,
      clientName
    );

    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'System Administrator'}" <${
        process.env.FROM_EMAIL || emailConfig.auth.user
      }>`,
      to: email,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error.message);
    return { success: false, error: error.message };
  }
};

// Send forgot password email
const sendForgotPasswordEmail = async (email, resetToken) => {
  try {
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      throw new Error(
        'Email credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.'
      );
    }

    await transporter.verify();

    const { subject, html, text } = forgotPasswordEmail(email, resetToken);

    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'System Administrator'}" <${
        process.env.FROM_EMAIL || emailConfig.auth.user
      }>`,
      to: email,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error.message);
    return { success: false, error: error.message };
  }
};

const handleGetClients = handleAsync(async (req, res) => {
  const clients = await User.getClients();
  if (!clients) {
    return res.status(404).json({ message: 'Problem getting clients' });
  }
  res.status(200).json(clients);
});

const handleCreateUser = handleAsync(async (req, res) => {
  const { email, external, roles, clientId } = req.body;

  if (!email || !roles || roles.length === 0) {
    return res.status(400).json({
      message: 'Please include all required fields: email and roles',
    });
  }

  if (external && !clientId) {
    return res.status(400).json({
      message: 'Client ID is required for external users',
    });
  }

  // Check if user already exists
  let existingUser = await User.getUser(email);
  if (existingUser) {
    return res.status(409).json({ message: 'User already exists' });
  }

  // Generate secure password
  const generatedPassword = generateSecurePassword();

  try {
    // Hash the generated password
    const hashedPwd = await bcrypt.hash(generatedPassword, 12);

    // Generate password reset token
    const resetToken = generatePasswordResetToken();
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create user
    await User.createUser(email, hashedPwd);

    // Get the created user
    const newUser = await User.getUser(email);
    if (!newUser) {
      throw new Error('Failed to retrieve created user');
    }

    // Store reset token and expiry
    await User.setPasswordResetToken(
      newUser.uuid,
      resetToken,
      resetTokenExpiry
    );

    // Add user roles
    await User.addUserRoles(newUser.uuid, roles);

    // Add user profile
    const profileClientId = external ? clientId : 188;
    await User.addUserProfile(newUser.uuid, profileClientId);

    // Get client name for email (if external user)
    let clientName = '';
    if (external && clientId) {
      const clients = await User.getClients();
      const client = clients.find((c) => c.clientId === clientId);
      clientName = client ? client.clientName : 'Unknown Client';
    }

    // Send welcome email with reset token
    const emailResult = await sendWelcomeEmail(
      email,
      generatedPassword,
      resetToken,
      external,
      clientName
    );

    const response = {
      success: `User ${email} created successfully`,
      emailSent: emailResult.success,
      resetTokenGenerated: true,
    };

    if (!emailResult.success) {
      response.emailError = emailResult.error;
      console.warn(`User created but email failed: ${emailResult.error}`);
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      message: 'Failed to create user',
      error: error.message,
    });
  }
});

const handlePasswordReset = handleAsync(async (req, res) => {
  const { token, email, newPassword } = req.body;

  if (!token || !email || !newPassword) {
    return res.status(400).json({
      message: 'Token, email, and new password are required',
    });
  }

  try {
    const user = await User.getUserByResetToken(token, email);

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token',
      });
    }

    if (new Date() > new Date(user.resetTokenExpiry)) {
      return res.status(400).json({
        message: 'Reset token has expired',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await User.updatePassword(user.uuid, hashedPassword);
    await User.clearPasswordResetToken(user.uuid);

    res.status(200).json({
      success:
        'Password updated successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      message: 'Failed to reset password',
      error: error.message,
    });
  }
});

const handleVerifyResetToken = handleAsync(async (req, res) => {
  const { token, email } = req.query;

  if (!token || !email) {
    return res.status(400).json({
      message: 'Token and email are required',
    });
  }

  try {
    const user = await User.getUserByResetToken(token, email);

    if (!user) {
      return res.status(400).json({
        valid: false,
        message: 'Invalid reset token',
      });
    }

    if (new Date() > new Date(user.resetTokenExpiry)) {
      return res.status(400).json({
        valid: false,
        message: 'Reset token has expired',
      });
    }

    res.status(200).json({
      valid: true,
      email: user.email,
      message: 'Token is valid',
    });
  } catch (error) {
    console.error('Error verifying reset token:', error);
    res.status(500).json({
      valid: false,
      message: 'Failed to verify token',
    });
  }
});

const handleForgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const existingUser = await User.getUser(email);
    if (!existingUser) {
      // For security, don't reveal if email exists or not
      return res.status(200).json({
        success: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    const resetToken = generatePasswordResetToken();
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await User.setPasswordResetToken(existingUser.uuid, resetToken, resetTokenExpiry);

    const emailResult = await sendForgotPasswordEmail(email, resetToken);

    if (!emailResult.success) {
      console.warn(`Reset email failed to send: ${emailResult.error}`);
    }

    res.status(200).json({
      success: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({
      message: 'Failed to process request'
    });
  }
};

const handleGetAllUsers = async (req, res) => {
  try {
    const usersFromDb = await User.getAllUsersWithClient();
    if (!usersFromDb || usersFromDb.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    const users = usersFromDb.map(user => ({
      ...user,
      roles: user.roles ? user.roles.split(', ') : []
    }));

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

const handleUpdateUserRoles = handleAsync(async (req, res) => {
  const { email, roles } = req.body;

  if (!email || !Array.isArray(roles)) {
    return res.status(400).json({ message: 'Email and an array of roles are required.' });
  }

  const user = await User.getUser(email);
  if (!user) {
    return res.status(404).json({ message: `User with email ${email} not found.` });
  }

  await User.updateUserRoles(user.uuid, roles);

  res.status(200).json({ success: `Roles for ${email} have been updated successfully.` });
});

const handleUpdateUserProfile = handleAsync(async (req, res) => {
  const { email, clientId } = req.body;

  if (!email || !clientId) {
    return res.status(400).json({ message: 'Email and clientId are required.' });
  }

  const user = await User.getUser(email);
  if (!user) {
    return res.status(404).json({ message: `User with email ${email} not found.` });
  }

  await User.updateUserProfileClient(user.uuid, clientId);

  res.status(200).json({ success: `Profile for ${email} has been updated successfully.` });
});

const handleGetUsersByClientId = handleAsync(async (req, res) => {
  const { clientId } = req.params;
  if (!clientId) {
    return res.status(400).json({ message: 'Client ID is required' });
  }
  const users = await User.getUsersByClientId(clientId);
  if (!users) {
    return res.status(404).json({ message: 'No users found for this client' });
  }
  res.status(200).json(users);
});

const handleDeleteUser = async (req, res) => {
  const { email } = req.params;

  if (!email) {
    return res.status(400).json({ message: 'User email is required for deletion' });
  }

  try {
    const rowsAffected = await User.deleteUserByEmail(email);

    if (rowsAffected[0] === 0) {
      return res.status(404).json({ message: `User with email '${email}' not found` });
    }

    res.status(200).json({ message: `User '${email}' deleted successfully` });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

const handleTestEmail = handleAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required for testing' });
  }

  try {
    await transporter.verify();
    const testResult = await sendWelcomeEmail(
      email,
      'TestPassword123!',
      'test-token',
      false,
      ''
    );

    res.status(200).json({
      message: 'Email configuration test completed',
      result: testResult,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Email configuration test failed',
      error: error.message,
    });
  }
});

const handleUpdateLastActive = handleAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    await User.updateLastActive(email);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating last active:', error);
    res.status(500).json({ message: 'Failed to update last active', error: error.message });
  }
});

module.exports = {
  handleGetClients,
  handleCreateUser,
  handlePasswordReset,
  handleVerifyResetToken,
  handleForgotPassword,
  handleTestEmail,
  handleGetAllUsers,
  handleUpdateUserProfile,
  handleGetUsersByClientId,
  handleUpdateUserRoles,
  handleDeleteUser,
  handleUpdateLastActive,
};
