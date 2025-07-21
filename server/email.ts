import { Resend } from 'resend';
import sgMail from '@sendgrid/mail';

// Resend configuration (primary email service)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// SendGrid configuration (fallback email service)
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (RESEND_API_KEY) {
  
} 
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);

} 
if (!RESEND_API_KEY && !SENDGRID_API_KEY) {
  console.warn("No email service configured. Email functionality will be disabled.");
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  // Try Resend first (primary service)
  if (resend) {
    try {
      // For testing: if sending to your verified email, use Resend; otherwise skip to SendGrid
      if (params.to === "w.ineza@alustudent.com") {
        const emailData: any = {
          from: "onboarding@resend.dev",
          to: params.to,
          subject: params.subject,
        };
        
        if (params.html) emailData.html = params.html;
        if (params.text) emailData.text = params.text;
        
        const result = await resend.emails.send(emailData);
        
        if (result.error) {
          console.log(`Resend failed with error: ${JSON.stringify(result.error)}`);
          throw new Error(`Resend API error: ${result.error.message || JSON.stringify(result.error)}`);
        }
        
        if (result.data && result.data.id) {
  
          return true;
        }
      } else {
        // Skip Resend for unverified emails and go straight to SendGrid
        console.log(`Skipping Resend for ${params.to} (not your verified email), trying SendGrid...`);
        throw new Error("Skipping to SendGrid for unverified recipient");
      }
    } catch (error: any) {
      console.error('Resend email error:', error);
      // If it's a domain verification error, explain and fall back
      if (error?.error?.statusCode === 403) {
        console.error(`Resend domain verification issue detected.`);
        console.error(`Error: ${error.error?.error || 'Domain not verified'}`);
        console.error(`Falling back to SendGrid for ${params.to}...`);
      }
    }
  }

  // Fallback to SendGrid
  if (!SENDGRID_API_KEY) {
    console.error("Cannot send email: No SendGrid API key configured");
    return false;
  }
  
  console.log(`Attempting to send email via SendGrid to ${params.to}...`);

  try {
    const emailData: any = {
      to: params.to,
      from: "w.ineza@alustudent.com", // Use your verified email address
      subject: params.subject,
    };
    
    if (params.html) emailData.html = params.html;
    if (params.text) emailData.text = params.text;
    
    await sgMail.send(emailData);
    console.log(`Email sent successfully via SendGrid to ${params.to}`);
    return true;
  } catch (error: any) {
    // Handle SendGrid specific errors
    console.error('SendGrid email error:', error);
    
    // Log detailed error information
    if (error.response?.body?.errors) {
      console.error('SendGrid detailed errors:', JSON.stringify(error.response.body.errors, null, 2));
    }
    if (error.response?.body) {
      console.error('SendGrid full response body:', JSON.stringify(error.response.body, null, 2));
    }
    
    // Log email details for debugging when SendGrid fails
    console.error(`=== EMAIL DELIVERY FAILED ===`);
    console.error(`To: ${params.to}`);
    console.error(`Subject: ${params.subject}`);
    console.error(`From: ${params.from || "no-reply@rindwa.com"}`);
    console.error(`Error: ${error.message || error}`);
    console.error(`API Key starts with: ${SENDGRID_API_KEY ? SENDGRID_API_KEY.substring(0, 10) + '...' : 'Not configured'}`);
    console.error(`=============================`);
    
    return false;
  }
}

export function generateInvitationEmail(
  inviteeEmail: string,
  inviterName: string,
  role: string,
  organizationName?: string,
  stationName?: string,
  token?: string
): { subject: string; html: string; text: string } {
  const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/accept-invitation/${token}`;
  
  const subject = `Invitation to join Rindwa Emergency Management Platform`;
  
  const text = `
Hello,

You have been invited by ${inviterName} to join the Rindwa Emergency Management Platform as a ${role.replace('_', ' ')}.

${organizationName ? `Organization: ${organizationName}` : ''}
${stationName ? `Station: ${stationName}` : ''}

To accept this invitation and create your account, please click the following link:
${invitationUrl}

This invitation will expire in 72 hours.

Best regards,
Rindwa Emergency Management Team
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rindwa Platform Invitation</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .details { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rindwa Emergency Management Platform</h1>
    </div>
    <div class="content">
      <h2>You're Invited!</h2>
      <p>Hello,</p>
      <p>You have been invited by <strong>${inviterName}</strong> to join the Rindwa Emergency Management Platform as a <strong>${role.replace('_', ' ')}</strong>.</p>
      
      ${organizationName || stationName ? `
      <div class="details">
        <h3>Assignment Details:</h3>
        ${organizationName ? `<p><strong>Organization:</strong> ${organizationName}</p>` : ''}
        ${stationName ? `<p><strong>Station:</strong> ${stationName}</p>` : ''}
      </div>
      ` : ''}
      
      <p>To accept this invitation and create your account, please click the button below:</p>
      <a href="${invitationUrl}" class="button">Accept Invitation</a>
      
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><a href="${invitationUrl}">${invitationUrl}</a></p>
      
      <p><strong>Important:</strong> This invitation will expire in 72 hours.</p>
      
      <div class="footer">
        <p>Best regards,<br>Rindwa Emergency Management Team</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html, text };
}