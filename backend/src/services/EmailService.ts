import { Resend } from 'resend';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Handoff AI <noreply@handoff.ai>';

export interface EmailService {
  sendInvitation(email: string, inviterName: string, token: string): Promise<void>;
  sendPasswordReset(email: string, userName: string, token: string): Promise<void>;
  sendWelcome(email: string, userName: string): Promise<void>;
}

/**
 * Creates an EmailService instance using Resend
 */
export function createEmailService(): EmailService {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('RESEND_API_KEY not set - emails will be logged to console');
  }

  const resend = apiKey ? new Resend(apiKey) : null;

  async function sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!resend) {
      console.log('========== EMAIL (dev mode) ==========');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`HTML: ${html.substring(0, 500)}...`);
      console.log('======================================');
      return;
    }

    try {
      // In development, use Resend's test sender if domain isn't verified
      const fromAddress = process.env.NODE_ENV === 'production'
        ? EMAIL_FROM
        : 'Handoff AI <onboarding@resend.dev>';

      const { error } = await resend.emails.send({
        from: fromAddress,
        to,
        subject,
        html,
      });

      if (error) {
        console.error('Failed to send email:', error);
        // In development, log but don't throw to avoid breaking the flow
        if (process.env.NODE_ENV !== 'production') {
          console.log('========== EMAIL FAILED (dev mode) ==========');
          console.log(`To: ${to}`);
          console.log(`Subject: ${subject}`);
          console.log(`Error: ${error.message}`);
          console.log('Email would have been sent in production');
          console.log('==============================================');
          return;
        }
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log(`Email sent successfully to ${to}`);
    } catch (err) {
      console.error('Email service error:', err);
      // In development, don't throw to avoid breaking the invite/reset flow
      if (process.env.NODE_ENV !== 'production') {
        console.log('========== EMAIL ERROR (dev mode) ==========');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log('Email sending failed - continuing in dev mode');
        console.log('=============================================');
        return;
      }
      throw err;
    }
  }

  return {
    /**
     * Send invitation email to new user
     */
    async sendInvitation(email: string, inviterName: string, token: string): Promise<void> {
      const inviteUrl = `${FRONTEND_URL}/invite/${token}`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Handoff AI</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1A1A2E; padding: 32px 40px; text-align: center;">
              <img src="${FRONTEND_URL}/toucan-logo.svg" alt="Handoff AI" style="height: 40px; width: auto;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 24px; color: #1A1A2E; font-size: 24px; font-weight: 600;">
                You're Invited!
              </h1>

              <p style="margin: 0 0 16px; color: #4a4a5a; font-size: 16px; line-height: 1.6;">
                <strong>${inviterName}</strong> has invited you to join <strong>Handoff AI</strong> - the bridge between product specs and developer-ready work.
              </p>

              <p style="margin: 0 0 24px; color: #4a4a5a; font-size: 16px; line-height: 1.6;">
                Handoff AI transforms specification documents into structured, actionable Jira tickets. Upload your specs, let AI translate them into developer-ready tasks, and export directly to Jira.
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background-color: #FF6B35; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  Accept Invitation
                </a>
              </div>

              <p style="margin: 24px 0 0; color: #9999a5; font-size: 14px; line-height: 1.5;">
                This invitation expires in 72 hours. If you didn't expect this invitation, you can safely ignore this email.
              </p>

              <hr style="border: none; border-top: 1px solid #e5e5e7; margin: 32px 0;" />

              <p style="margin: 0; color: #9999a5; font-size: 12px;">
                If the button doesn't work, copy and paste this link into your browser:<br />
                <a href="${inviteUrl}" style="color: #FF6B35; word-break: break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f7; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #9999a5; font-size: 12px;">
                Powered by <strong>Toucan Labs</strong><br />
                Transforming specs into action
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

      await sendEmail(email, `${inviterName} invited you to join Handoff AI`, html);
    },

    /**
     * Send password reset email
     */
    async sendPasswordReset(email: string, userName: string, token: string): Promise<void> {
      const resetUrl = `${FRONTEND_URL}/reset-password/${token}`;
      const displayName = userName || 'there';

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1A1A2E; padding: 32px 40px; text-align: center;">
              <img src="${FRONTEND_URL}/toucan-logo.svg" alt="Handoff AI" style="height: 40px; width: auto;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 24px; color: #1A1A2E; font-size: 24px; font-weight: 600;">
                Reset Your Password
              </h1>

              <p style="margin: 0 0 16px; color: #4a4a5a; font-size: 16px; line-height: 1.6;">
                Hi ${displayName},
              </p>

              <p style="margin: 0 0 24px; color: #4a4a5a; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password for your Handoff AI account. Click the button below to create a new password.
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #FF6B35; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  Reset Password
                </a>
              </div>

              <div style="background-color: #FFF3CD; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.5;">
                  <strong>Security Note:</strong> This link expires in 1 hour. If you didn't request a password reset, please ignore this email - your password will remain unchanged.
                </p>
              </div>

              <hr style="border: none; border-top: 1px solid #e5e5e7; margin: 32px 0;" />

              <p style="margin: 0; color: #9999a5; font-size: 12px;">
                If the button doesn't work, copy and paste this link into your browser:<br />
                <a href="${resetUrl}" style="color: #FF6B35; word-break: break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f7; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #9999a5; font-size: 12px;">
                Powered by <strong>Toucan Labs</strong><br />
                Transforming specs into action
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

      await sendEmail(email, 'Reset your Handoff AI password', html);
    },

    /**
     * Send welcome email after account creation
     */
    async sendWelcome(email: string, userName: string): Promise<void> {
      const loginUrl = `${FRONTEND_URL}/login`;
      const displayName = userName || 'there';

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Handoff AI</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1A1A2E; padding: 32px 40px; text-align: center;">
              <img src="${FRONTEND_URL}/toucan-logo.svg" alt="Handoff AI" style="height: 40px; width: auto;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 24px; color: #1A1A2E; font-size: 24px; font-weight: 600;">
                Welcome to Handoff AI!
              </h1>

              <p style="margin: 0 0 16px; color: #4a4a5a; font-size: 16px; line-height: 1.6;">
                Hi ${displayName},
              </p>

              <p style="margin: 0 0 24px; color: #4a4a5a; font-size: 16px; line-height: 1.6;">
                Your account has been created and you're ready to start transforming your specs into developer-ready work items.
              </p>

              <h2 style="margin: 24px 0 16px; color: #1A1A2E; font-size: 18px; font-weight: 600;">
                Getting Started
              </h2>

              <ol style="margin: 0 0 24px; padding-left: 20px; color: #4a4a5a; font-size: 16px; line-height: 1.8;">
                <li><strong>Upload a spec</strong> - API specs, requirements docs, or design docs</li>
                <li><strong>Let AI translate</strong> - We'll break it down into epics, features, and stories</li>
                <li><strong>Review & refine</strong> - Edit the generated work items as needed</li>
                <li><strong>Export to Jira</strong> - Push directly to your Jira project</li>
              </ol>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${loginUrl}" style="display: inline-block; background-color: #FF6B35; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  Get Started
                </a>
              </div>

              <p style="margin: 24px 0 0; color: #9999a5; font-size: 14px; line-height: 1.5;">
                Have questions? Just reply to this email and we'll help you out.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f7; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #9999a5; font-size: 12px;">
                Powered by <strong>Toucan Labs</strong><br />
                Transforming specs into action
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

      await sendEmail(email, 'Welcome to Handoff AI!', html);
    },
  };
}
