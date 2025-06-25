const User = require('../services/Users');
const handleAsync = require('./asyncController');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Make sure to load environment variables at the top
require('dotenv').config();

// Debug: Log environment variables (remove in production)
console.log('Email config check:', {
  host: process.env.SMTP_HOST,
  user: process.env.SMTP_USER ? 'SET' : 'NOT SET',
  pass: process.env.SMTP_PASS ? 'SET' : 'NOT SET',
});

// Email configuration with fallbacks and validation
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Add these options for better Gmail compatibility
  tls: {
    rejectUnauthorized: false,
  },
};

// Validate email configuration
if (!emailConfig.auth.user || !emailConfig.auth.pass) {
  console.error(
    '❌ Email configuration error: SMTP_USER and SMTP_PASS must be set in environment variables'
  );
  console.log('Current values:', {
    SMTP_USER: process.env.SMTP_USER ? 'SET' : 'NOT SET',
    SMTP_PASS: process.env.SMTP_PASS ? 'SET' : 'NOT SET',
  });
}

// Alternative Gmail OAuth2 configuration (uncomment to use)
/*
const emailConfig = {
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.GMAIL_USER,
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
  },
};
*/

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Password generation function
const generateSecurePassword = (length = 12) => {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  // Ensure at least one of each type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
  password += '0123456789'[Math.floor(Math.random() * 10)]; // number
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // special char

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

// Email template function with password reset link
const createWelcomeEmailTemplate = (
  email,
  password,
  resetToken,
  isExternal,
  clientName
) => {
  const subject = 'Promark Portal - Your Account Has Been Created';
  const resetLink = `${
    process.env.FRONTEND_URL || 'http://localhost:5173'
  }/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .email-container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .credentials { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .password { font-family: monospace; font-size: 16px; font-weight: bold; color: #dc3545; }
        .reset-button { 
          display: inline-block; 
          background-color: #28a745; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 5px; 
          font-weight: bold; 
          margin: 15px 0;
        }
        .footer { background-color: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px; }
        .warning { color: #dc3545; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Welcome to Our Platform</h1>
        </div>
        <div class="content">
          <h2>Welcome to the Promark Portal!</h2>
          <p>Your account has been successfully created. Here are your temporary login credentials:</p>
          
          <div class="credentials">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> <span class="password">${password}</span></p>
            ${isExternal ? `<p><strong>Client:</strong> ${clientName}</p>` : ''}
          </div>
          
          <p class="warning">🔒 REQUIRED: You must change your password on first login</p>
          
          <p>Click the button below to log in and set your new password:</p>
          <p style="text-align: center;">
            <a href="${resetLink}" class="reset-button">Login & Change Password</a>
          </p>
          
          <p><small>Or copy this link: <br><a href="${resetLink}">${resetLink}</a></small></p>
          
          <p class="warning">⚠️ Important Security Notice:</p>
          <ul>
            <li><strong>You MUST change your password after clicking the link above</strong></li>
            <li>This link will expire in 24 hours</li>
            <li>Do not share these credentials with anyone</li>
            <li>Delete this email after setting your new password</li>
          </ul>
          
          <p>If you have any questions, please contact your administrator.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>Link expires: ${new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Welcome to the Promark Portal!
    
    Your account has been successfully created.
    
    Login Credentials:
    Email: ${email}
    Temporary Password: ${password}
    ${isExternal ? `Client: ${clientName}` : ''}
    
    REQUIRED: You must change your password on first login.
    
    Click this link to log in and set your new password:
    ${resetLink}
    
    This link will expire in 24 hours.
    
    If you have any questions, please contact your administrator.
  `;

  return { subject, html, text };
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
    // Check if email configuration is valid
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      throw new Error(
        'Email credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.'
      );
    }

    // Test connection before sending
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');

    const { subject, html, text } = createWelcomeEmailTemplate(
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
    console.log('✅ Welcome email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error.message);

    // Provide specific error messages for common issues
    if (error.message.includes('Invalid login')) {
      console.error(
        '💡 Tip: Make sure you are using an App Password for Gmail, not your regular password'
      );
    }
    if (error.message.includes('credentials')) {
      console.error(
        '💡 Tip: Check your .env file has SMTP_USER and SMTP_PASS set correctly'
      );
    }

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

  // Input validation
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

  const userId = req.user;

  // Check if user already exists
  let existingUser = await User.getUser(email);
  if (existingUser) {
    return res.status(409).json({ message: 'User already exists' });
  }

  // Generate secure password
  const generatedPassword = generateSecurePassword();

  // Set audit data
  req.auditData = {
    userid: userId,
    tableModified: 'tblAuthentication',
    columnModified: 'all',
    modifiedFrom: null,
    modifiedTo: 'creation',
  };

  try {
    // Hash the generated password
    const hashedPwd = await bcrypt.hash(generatedPassword, 12); // Increased salt rounds for better security

    // Generate password reset token
    const resetToken = generatePasswordResetToken();
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Create user
    const created = await User.createUser(email, hashedPwd);

    // Get the created user
    const newUser = await User.getUser(email);
    if (!newUser) {
      throw new Error('Failed to retrieve created user');
    }

    // Store reset token and expiry (you'll need to add these fields to your user table)
    await User.setPasswordResetToken(
      newUser.uuid,
      resetToken,
      resetTokenExpiry
    );

    // Add user roles
    await User.addUserRoles(newUser.uuid, roles);

    // Add user profile
    const profileClientId = external ? clientId : 188; // 188 is the default client id
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

    // Prepare response
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

    // If user was partially created, you might want to clean up
    // This depends on your User service implementation

    res.status(500).json({
      message: 'Failed to create user',
      error: error.message,
    });
  }
});

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

const handlePasswordReset = handleAsync(async (req, res) => {
  const { token, email, newPassword } = req.body;

  if (!token || !email || !newPassword) {
    console.log('❌ Missing required fields');
    return res.status(400).json({
      message: 'Token, email, and new password are required',
    });
  }

  try {
    console.log('🔍 Verifying reset token...');
    // Verify the reset token
    const user = await User.getUserByResetToken(token, email);
    console.log('👤 User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('❌ Invalid reset token');
      return res.status(400).json({
        message: 'Invalid or expired reset token',
      });
    }

    // Check if token is expired
    if (new Date() > new Date(user.resetTokenExpiry)) {
      console.log('❌ Token expired');
      return res.status(400).json({
        message: 'Reset token has expired',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await User.updatePassword(user.uuid, hashedPassword);
    await User.clearPasswordResetToken(user.uuid);

    res.status(200).json({
      success:
        'Password updated successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    res.status(500).json({
      message: 'Failed to reset password',
      error: error.message,
    });
  }
});

// Verify reset token (for frontend to check if token is valid)
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
    // Check if user exists
    const existingUser = await User.getUser(email);
    if (!existingUser) {
      // For security, don't reveal if email exists or not
      return res.status(200).json({ 
        success: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate password reset token
    const resetToken = generatePasswordResetToken();
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Store reset token
    await User.setPasswordResetToken(existingUser.uuid, resetToken, resetTokenExpiry);

    // Send reset email (reuse the email template from addUser but modify it)
    const emailResult = await sendForgotPasswordEmail(email, resetToken);

    if (!emailResult.success) {
      console.warn(`Reset email failed to send: ${emailResult.error}`);
      // Still return success for security reasons
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

// Email template specifically for forgot password
const sendForgotPasswordEmail = async (email, resetToken) => {
  try {
    // Check if email configuration is valid
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      throw new Error(
        'Email credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.'
      );
    }

    // Test connection before sending
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const subject = 'Promark Portal - Password Reset Request';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .email-container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .reset-button { 
            display: inline-block; 
            background-color: #28a745; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: bold; 
            margin: 15px 0;
          }
          .footer { background-color: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px; }
          .warning { color: #dc3545; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello!</h2>
            <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
            
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="reset-button">Reset My Password</a>
            </p>
            
            <p><small>Or copy this link: <br><a href="${resetLink}">${resetLink}</a></small></p>
            
            <p class="warning">⚠️ Important:</p>
            <ul>
              <li>This link will expire in 24 hours</li>
              <li>If you didn't request this reset, please contact support</li>
              <li>Never share this link with anyone</li>
            </ul>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>Link expires: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request
      
      We received a request to reset your password for your account.
      
      If you didn't make this request, you can safely ignore this email.
      
      Click this link to reset your password:
      ${resetLink}
      
      This link will expire in 24 hours.
      
      If you have any questions, please contact support.
    `;

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
    console.log('✅ Password reset email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.message);
    return { success: false, error: error.message };
  }
};

handleGetAllUsers = async (req, res) => {
  try {
    const usersFromDb = await User.getAllUsers();
    if (!usersFromDb || usersFromDb.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    // Convert the comma-separated roles string into an array for each user
    const users = usersFromDb.map(user => ({
      ...user,
      roles: user.roles ? user.roles.split(', ') : []
    }));

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
}

const handleUpdateUserRoles = handleAsync(async (req, res) => {
    const { email, roles } = req.body;

    // Validate that roles is an array, even if it's empty
    if (!email || !Array.isArray(roles)) {
        return res.status(400).json({ message: 'Email and an array of roles are required.' });
    }

    const user = await User.getUser(email);
    if (!user) {
        return res.status(404).json({ message: `User with email ${email} not found.` });
    }

    // Call the "sync" function in the database service
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

module.exports = {
  handleGetClients,
  handleCreateUser,
  handlePasswordReset,
  handleVerifyResetToken,
  handleForgotPassword, 
  handleTestEmail,
  handleGetAllUsers,
  handleUpdateUserProfile,
  handleUpdateUserRoles
  
};