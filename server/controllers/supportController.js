// server/controllers/supportController.js
const nodemailer = require('nodemailer');
const handleAsync = require('./asyncController');

// Email configuration (reuse existing config)
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

// User confirmation email template
const createUserConfirmationTemplate = (userEmail, userName, subject, message, priority) => {
  const priorityLabels = {
    low: 'Low Priority',
    normal: 'Normal Priority',
    high: 'High Priority', 
    critical: 'CRITICAL'
  };

  const confirmSubject = `Support Request Received - ${subject}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .ticket-info { background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; }
        .footer { text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>✅ Support Request Received</h2>
        </div>
        
        <div class="content">
          <p>Hello ${userName || userEmail},</p>
          
          <p>We've received your support request and our team will review it shortly. Here are the details:</p>
          
          <div class="ticket-info">
            <h3>Request Details:</h3>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Priority:</strong> ${priorityLabels[priority]}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <h3>Your Message:</h3>
          <p style="background: white; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${message}</p>
          
          <p><strong>What happens next?</strong></p>
          <ul>
            <li>Our support team will review your request</li>
            <li>You'll receive a response via email within 24-48 hours</li>
            <li>For urgent issues, we'll prioritize accordingly</li>
          </ul>
          
          <p>If you need to add more information, simply reply to this email.</p>
        </div>
        
        <div class="footer">
          <p>Thank you for contacting Promark Research support!</p>
          <p><em>This is an automated confirmation. Please do not reply unless adding information.</em></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Support Request Received
    
    Hello ${userName || userEmail},
    
    We've received your support request and our team will review it shortly.
    
    Request Details:
    Subject: ${subject}
    Priority: ${priorityLabels[priority]}
    Submitted: ${new Date().toLocaleString()}
    
    Your Message:
    ${message}
    
    What happens next?
    - Our support team will review your request
    - You'll receive a response via email within 24-48 hours
    - For urgent issues, we'll prioritize accordingly
    
    If you need to add more information, simply reply to this email.
    
    Thank you for contacting Promark Research support!
  `;

  return { subject: confirmSubject, html, text };
};

const transporter = nodemailer.createTransport(emailConfig);

const createSupportEmailTemplate = (userEmail, userName, subject, message, priority) => {
  const priorityColors = {
    low: '#28a745',
    normal: '#ffc107', 
    high: '#fd7e14',
    critical: '#dc3545'
  };

  const priorityLabels = {
    low: 'Low Priority',
    normal: 'Normal Priority',
    high: 'High Priority', 
    critical: 'CRITICAL'
  };

  const emailSubject = `[SUPPORT] ${priorityLabels[priority]} - ${subject}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .priority-badge { 
          display: inline-block; 
          padding: 5px 12px; 
          border-radius: 20px; 
          color: white; 
          font-weight: bold; 
          background: ${priorityColors[priority]};
        }
        .info-section { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .message-content { 
          background: white; 
          padding: 20px; 
          border: 1px solid #dee2e6; 
          border-radius: 5px; 
          white-space: pre-wrap;
          font-family: monospace;
        }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Support Request Received</h2>
          <div class="priority-badge">${priorityLabels[priority]}</div>
        </div>
        
        <div class="info-section">
          <h3>Request Details:</h3>
          <p><strong>From:</strong> ${userName || 'User'} (${userEmail})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Priority:</strong> ${priorityLabels[priority]}</p>
          <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <h3>Message:</h3>
        <div class="message-content">${message}</div>
        
        <div class="footer">
          <p><em>This message was sent from the Promark Client Portal support form.</em></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    SUPPORT REQUEST - ${priorityLabels[priority]}
    
    From: ${userName || 'User'} (${userEmail})
    Subject: ${subject}
    Priority: ${priorityLabels[priority]}
    Submitted: ${new Date().toLocaleString()}
    
    Message:
    ${message}
    
    ---
    This message was sent from the Promark Client Portal support form.
  `;

  return { subject: emailSubject, html, text };
};

const handleContactSupport = handleAsync(async (req, res) => {
  const { subject, message, priority = 'normal' } = req.body;
  
  // Get user info from the authenticated request
  // Based on your verifyJWT middleware: req.user = decoded.UserInfo.username (which is the email)
  const userEmail = req.user; // This is the email from your JWT
  const userName = null; // You don't store names in JWT, so leave as null
  
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

  // Debug logging
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
    const { subject: emailSubject, html: supportHtml, text: supportText } = createSupportEmailTemplate(
      userEmail, 
      userName, 
      subject, 
      message, 
      priority
    );

    const supportMailOptions = {
      from: `"${process.env.FROM_NAME || 'Portal Support'}" <${
        process.env.FROM_EMAIL || emailConfig.auth.user
      }>`,
      to: 'support@promarkresearch.com',
      replyTo: userEmail, // Support can reply directly to user
      subject: emailSubject,
      text: supportText,
      html: supportHtml,
    };

    // 2. Send confirmation email to user
    const { subject: confirmSubject, html: confirmHtml, text: confirmText } = createUserConfirmationTemplate(
      userEmail,
      userName,
      subject,
      message,
      priority
    );

    const userMailOptions = {
      from: `"${process.env.FROM_NAME || 'Portal Support'}" <${
        process.env.FROM_EMAIL || emailConfig.auth.user
      }>`,
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

    console.log('✅ Support email sent successfully:', supportInfo.messageId);
    console.log('✅ User confirmation sent successfully:', userInfo.messageId);
    
    res.status(200).json({ 
      success: true,
      message: 'Support request sent successfully',
      supportTicketId: supportInfo.messageId,
      confirmationSent: true
    });

  } catch (error) {
    console.error('❌ Error sending support email:', error.message);
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to send support request. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = {
  handleContactSupport
};