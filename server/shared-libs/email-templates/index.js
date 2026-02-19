/**
 * Shared email templates for Portal services.
 * Design: Clean, modern Stripe/Vercel-style transactional emails.
 * White card on subtle gray background, minimal branding, generous spacing.
 * All critical CSS is inlined. <style> block used only for dark mode + resets.
 */

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Shared Layout Components ────────────────────────────────────────────────

const preheader = (text) => `
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
  ${text}${'&#847;'.repeat(40)}
</div>`;

const head = `
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0;mso-table-rspace:0}
    img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
    @media(prefers-color-scheme:dark){
      .em-bg{background-color:#111111!important}
      .em-card{background-color:#1c1c1e!important;border-color:#2c2c2e!important}
      .em-h{color:#f5f5f5!important}
      .em-t{color:#d4d4d4!important}
      .em-m{color:#a0a0a0!important}
      .em-hr{border-color:#2c2c2e!important}
      .em-code{background-color:#2c2c2e!important;color:#f5f5f5!important}
      .em-info{background-color:#1a1f2e!important;border-color:#2a3a5c!important}
      .em-btn td{background-color:#3b82f6!important}
    }
  </style>
</head>`;

const baseLayout = (preheaderText, bodyContent) => `
<!DOCTYPE html>
<html lang="en">
${head}
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;" class="em-bg">
  ${preheader(preheaderText)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6;" class="em-bg">
    <tr>
      <td align="center" style="padding:48px 24px;">

        <!-- Logo -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="padding-bottom:28px;text-align:center;">
              <span style="font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.03em;" class="em-h">Portal</span>
            </td>
          </tr>
        </table>

        <!-- Card -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" class="em-card" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:44px 48px;">
              ${bodyContent}
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="padding:28px 0 0 0;text-align:center;">
              <p class="em-m" style="margin:0;font-size:12px;line-height:18px;color:#9ca3af;">Promark Client Portal</p>
              <p class="em-m" style="margin:4px 0 0 0;font-size:12px;line-height:18px;color:#9ca3af;">This is an automated message. Please do not reply.</p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

const divider = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr><td class="em-hr" style="border-top:1px solid #eaeaea;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>`;

const button = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;" class="em-btn">
  <tr>
    <td style="border-radius:8px;background-color:#111827;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;

const linkFallback = (href) => `
<p class="em-m" style="margin:0 0 0 0;font-size:12px;line-height:18px;color:#9ca3af;word-break:break-all;">
  Or copy and paste this URL: <a href="${href}" style="color:#6b7280;">${href}</a>
</p>`;

const heading = (text) =>
  `<h1 class="em-h" style="margin:0 0 12px 0;font-size:22px;font-weight:700;line-height:1.3;color:#111827;">${text}</h1>`;

const paragraph = (text) =>
  `<p class="em-t" style="margin:0 0 16px 0;font-size:15px;line-height:26px;color:#374151;">${text}</p>`;

const mutedText = (text) =>
  `<p class="em-m" style="margin:0;font-size:13px;line-height:20px;color:#6b7280;">${text}</p>`;

const infoBlock = (content) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;" class="em-info">
  <tr>
    <td style="background-color:#f0f4ff;border:1px solid #dbeafe;border-radius:8px;padding:20px 24px;">
      ${content}
    </td>
  </tr>
</table>`;

const codeBlock = (text) =>
  `<code class="em-code" style="display:inline-block;font-family:'SF Mono','Fira Code','Courier New',monospace;font-size:15px;font-weight:700;color:#111827;background-color:#f4f4f5;padding:3px 8px;border-radius:4px;">${text}</code>`;

const warningBlock = (text) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
  <tr>
    <td style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 20px;">
      <p style="margin:0;font-size:13px;font-weight:600;line-height:20px;color:#dc2626;">${text}</p>
    </td>
  </tr>
</table>`;

const bulletList = (items) => {
  const lis = items.map(
    (item) => `<li class="em-t" style="margin:0 0 6px 0;font-size:14px;line-height:22px;color:#374151;">${item}</li>`
  ).join('');
  return `<ul style="margin:0;padding-left:20px;">${lis}</ul>`;
};

const infoRow = (label, value) =>
  `<p class="em-t" style="margin:0 0 6px 0;font-size:14px;line-height:22px;color:#374151;"><span style="color:#6b7280;">${label}</span> ${value}</p>`;

// ─── Welcome Email ───────────────────────────────────────────────────────────

const welcomeEmail = (email, password, resetToken, isExternal = false, clientName = '') => {
  const resetLink = `${FRONTEND_URL()}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  const subject = 'Welcome to the Portal — Set Your Password';

  const bodyContent = `
    ${heading('Your account is ready')}
    ${paragraph('Welcome to the Promark Client Portal. Your account has been created with temporary credentials. You\'ll need to set a new password before you can sign in.')}

    ${infoBlock(`
      ${infoRow('Email', `<strong>${email}</strong>`)}
      ${infoRow('Temporary password', codeBlock(password))}
      ${isExternal ? infoRow('Client', `<strong>${clientName}</strong>`) : ''}
    `)}

    ${warningBlock('You must change your password before signing in. This link expires in 24 hours.')}

    ${button(resetLink, 'Set your password')}
    ${linkFallback(resetLink)}

    ${divider}

    ${mutedText('If you didn\'t expect this email, contact your administrator. Do not share your credentials with anyone.')}
  `;

  const html = baseLayout('Your account has been created', bodyContent);

  const text = `Welcome to the Promark Client Portal

Your account has been created.

Email: ${email}
Temporary Password: ${password}${isExternal ? `\nClient: ${clientName}` : ''}

You must change your password before signing in.
Set your password here: ${resetLink}

This link expires in 24 hours.
Do not share your credentials with anyone.`;

  return { subject, html, text };
};

// ─── Forgot Password Email ──────────────────────────────────────────────────

const forgotPasswordEmail = (email, resetToken) => {
  const resetLink = `${FRONTEND_URL()}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  const subject = 'Reset your password';

  const bodyContent = `
    ${heading('Reset your password')}
    ${paragraph('We received a request to reset the password for your account. Click the button below to choose a new password.')}

    ${button(resetLink, 'Reset password')}
    ${linkFallback(resetLink)}

    ${divider}

    ${mutedText('This link expires in 24 hours. If you didn\'t request a password reset, you can safely ignore this email — your password won\'t be changed.')}
  `;

  const html = baseLayout('Reset your password', bodyContent);

  const text = `Reset your password

We received a request to reset the password for your account.

Reset your password: ${resetLink}

This link expires in 24 hours.
If you didn't request this, you can safely ignore this email.`;

  return { subject, html, text };
};

// ─── Reset Password Email (auth-service — path param URL format) ─────────────

const resetPasswordEmail = (email, resetToken) => {
  const resetLink = `${FRONTEND_URL()}/reset-password/${resetToken}?email=${encodeURIComponent(email)}`;

  const subject = 'Reset your password';

  const bodyContent = `
    ${heading('Reset your password')}
    ${paragraph('Someone requested a password reset for your account. If this was you, click the button below to set a new password.')}

    ${button(resetLink, 'Reset password')}
    ${linkFallback(resetLink)}

    ${divider}

    ${mutedText('This link expires in 1 hour. If you didn\'t request this, ignore this email and your password will remain unchanged.')}
  `;

  const html = baseLayout('Password reset requested', bodyContent);

  const text = `Reset your password

Someone requested a password reset for your account.

Reset your password: ${resetLink}

This link expires in 1 hour.
If you didn't request this, ignore this email.`;

  return { subject, html, text };
};

// ─── Support Confirmation Email (sent to user) ─────────────────────────────

const supportConfirmationEmail = (userEmail, userName, subject, message, priority) => {
  const priorityLabels = { low: 'Low', normal: 'Normal', high: 'High', critical: 'Critical' };
  const displayName = userName || userEmail;

  const confirmSubject = `We received your request — ${subject}`;

  const bodyContent = `
    ${heading('We\'ve got your request')}
    ${paragraph(`Hi ${displayName}, thanks for reaching out. Our team will review your support request and get back to you.`)}

    ${infoBlock(`
      ${infoRow('Subject', `<strong>${subject}</strong>`)}
      ${infoRow('Priority', `<strong>${priorityLabels[priority] || priority}</strong>`)}
      ${infoRow('Submitted', new Date().toLocaleString())}
    `)}

    <p class="em-t" style="margin:20px 0 8px 0;font-size:14px;font-weight:600;line-height:22px;color:#111827;">Your message</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td class="em-code" style="background-color:#f4f4f5;border-radius:8px;padding:16px 20px;">
          <p class="em-t" style="margin:0;font-size:14px;line-height:22px;color:#374151;white-space:pre-wrap;">${message}</p>
        </td>
      </tr>
    </table>

    ${divider}

    <p class="em-t" style="margin:0 0 8px 0;font-size:14px;font-weight:600;line-height:22px;color:#111827;">What happens next?</p>
    ${bulletList([
      'Our support team will review your request',
      'You\'ll receive a response within 24–48 hours',
      'Urgent issues are prioritized accordingly',
    ])}
  `;

  const html = baseLayout(`Support request received — ${subject}`, bodyContent);

  const text = `We received your support request

Hi ${displayName},

Thanks for reaching out. Our team will review your request and get back to you.

Subject: ${subject}
Priority: ${priorityLabels[priority] || priority}
Submitted: ${new Date().toLocaleString()}

Your message:
${message}

What happens next?
- Our support team will review your request
- You'll receive a response within 24-48 hours
- Urgent issues are prioritized accordingly`;

  return { subject: confirmSubject, html, text };
};

// ─── Support Ticket Email (sent to support team) ───────────────────────────

const supportTicketEmail = (userEmail, userName, subject, message, priority) => {
  const priorityLabels = { low: 'Low', normal: 'Normal', high: 'High', critical: 'CRITICAL' };
  const priorityColors = { low: '#10b981', normal: '#f59e0b', high: '#f97316', critical: '#dc2626' };
  const badgeColor = priorityColors[priority] || '#6b7280';

  const emailSubject = `[${(priorityLabels[priority] || priority).toUpperCase()}] ${subject} — ${userName || userEmail}`;

  const bodyContent = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
      <tr>
        <td>
          ${heading('New support request')}
        </td>
        <td style="vertical-align:top;padding:2px 0 0 12px;">
          <span style="display:inline-block;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;color:#ffffff;background-color:${badgeColor};letter-spacing:0.02em;">${priorityLabels[priority] || priority}</span>
        </td>
      </tr>
    </table>

    ${infoBlock(`
      ${infoRow('From', `<strong>${userName || 'User'}</strong> (<a href="mailto:${userEmail}" style="color:#3b82f6;">${userEmail}</a>)`)}
      ${infoRow('Subject', `<strong>${subject}</strong>`)}
      ${infoRow('Priority', `<strong>${priorityLabels[priority] || priority}</strong>`)}
      ${infoRow('Submitted', new Date().toLocaleString())}
    `)}

    <p class="em-t" style="margin:20px 0 8px 0;font-size:14px;font-weight:600;line-height:22px;color:#111827;">Message</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td class="em-code" style="background-color:#f4f4f5;border-radius:8px;padding:16px 20px;">
          <p style="margin:0;font-size:14px;line-height:22px;color:#374151;white-space:pre-wrap;font-family:'SF Mono','Fira Code','Courier New',monospace;">${message}</p>
        </td>
      </tr>
    </table>
  `;

  const html = baseLayout(`Support: ${subject}`, bodyContent);

  const text = `SUPPORT REQUEST — ${priorityLabels[priority] || priority}

From: ${userName || 'User'} (${userEmail})
Subject: ${subject}
Priority: ${priorityLabels[priority] || priority}
Submitted: ${new Date().toLocaleString()}

Message:
${message}`;

  return { subject: emailSubject, html, text };
};

module.exports = {
  welcomeEmail,
  forgotPasswordEmail,
  resetPasswordEmail,
  supportConfirmationEmail,
  supportTicketEmail,
};
