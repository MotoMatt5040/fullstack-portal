// Notification Service - supportController.js
const nodemailer = require('nodemailer');
const { supportConfirmationEmail, supportTicketEmail } = require('@internal/email-templates');

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
};

const transporter = nodemailer.createTransport(emailConfig);

const handleContactSupport = async (req, res) => {
  const { subject, message, priority = 'normal' } = req.body;

  // Get user info from the authenticated request
  const userEmail = req.user;
  const userName = null;

  // Validation
  if (!subject || !message) {
    return res.status(400).json({
      message: 'Subject and message are required'
    });
  }

  if (!['low', 'normal', 'high', 'critical'].includes(priority)) {
    return res.status(400).json({
      message: 'Invalid priority level'
    });
  }

  console.log('Support request from user:', userEmail);
  console.log('Request payload:', { subject, message, priority });

  try {
    // Check if email configuration is valid
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      throw new Error('Email credentials not configured');
    }

    // Test connection
    await transporter.verify();

    // 1. Send support ticket to support team
    const { subject: emailSubject, html: supportHtml, text: supportText } = supportTicketEmail(
      userEmail,
      userName,
      subject,
      message,
      priority
    );

    const supportMailOptions = {
      from: `"${process.env.FROM_NAME || 'Portal Support'}" <${process.env.FROM_EMAIL || emailConfig.auth.user}>`,
      to: 'support@promarkresearch.com',
      replyTo: userEmail,
      subject: emailSubject,
      text: supportText,
      html: supportHtml,
    };

    // 2. Send confirmation email to user
    const { subject: confirmSubject, html: confirmHtml, text: confirmText } = supportConfirmationEmail(
      userEmail,
      userName,
      subject,
      message,
      priority
    );

    const userMailOptions = {
      from: `"${process.env.FROM_NAME || 'Portal Support'}" <${process.env.FROM_EMAIL || emailConfig.auth.user}>`,
      to: userEmail,
      subject: confirmSubject,
      text: confirmText,
      html: confirmHtml,
    };

    // Send both emails
    const [supportInfo, userInfo] = await Promise.all([
      transporter.sendMail(supportMailOptions),
      transporter.sendMail(userMailOptions)
    ]);

    console.log('Support email sent successfully:', supportInfo.messageId);
    console.log('User confirmation sent successfully:', userInfo.messageId);

    res.status(200).json({
      success: true,
      message: 'Support request sent successfully',
      supportTicketId: supportInfo.messageId,
      confirmationSent: true
    });

  } catch (error) {
    console.error('Error sending support email:', error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to send support request. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  handleContactSupport
};
