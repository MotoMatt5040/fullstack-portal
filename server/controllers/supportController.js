// server/controllers/supportController.js
const nodemailer = require('nodemailer');
const handleAsync = require('../middleware/handleAsync');

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

const transporter = nodemailer.createTransporter(emailConfig);

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
  const userEmail = req.email; // This should come from your auth middleware
  const userName = req.userName || null; // If you have user name in the token
  
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

  try {
    // Check if email configuration is valid
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      throw new Error('Email credentials not configured');
    }

    // Test connection
    await transporter.verify();

    const { subject: emailSubject, html, text } = createSupportEmailTemplate(
      userEmail, 
      userName, 
      subject, 
      message, 
      priority
    );

    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'Portal Support'}" <${emailConfig.auth.user}>`,
      to: 'support@promarkresearch.com',
      replyTo: userEmail, // Allow support to reply directly to user
      subject: emailSubject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Support email sent successfully:', info.messageId);
    
    res.status(200).json({ 
      success: true,
      message: 'Support request sent successfully',
      messageId: info.messageId 
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