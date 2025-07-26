import { Resend } from 'resend';
import sgMail from '@sendgrid/mail';
import { Request } from 'express';

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

/**
 * Determine the correct base URL for the frontend based on environment
 */
export function getFrontendUrl(req?: Request): string {
  // 1. Check for explicit environment variable first
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  
  // 2. Try to determine from request headers (for dynamic deployment environments)
  if (req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    
    if (host) {
      // For development, if we detect localhost, use the correct port
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return `${protocol}://localhost:5173`;
      }
      return `${protocol}://${host}`;
    }
  }
  
  // 3. Default fallback for development (using correct Vite port)
  return 'http://localhost:5173';
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  console.log(`📧 Attempting to send email to: ${params.to}`);
  console.log(`📧 Subject: ${params.subject}`);

  // Try Resend first (primary service)
  if (resend) {
    try {
      console.log(`📧 Trying Resend service for ${params.to}...`);
      
      const emailData: any = {
        from: "onboarding@resend.dev", // Using the verified domain
        to: params.to,
        subject: params.subject,
      };
      
      if (params.html) emailData.html = params.html;
      if (params.text) emailData.text = params.text;
      
      const result = await resend.emails.send(emailData);
      
      if (result.error) {
        console.error(`❌ Resend failed with error: ${JSON.stringify(result.error)}`);
        throw new Error(`Resend API error: ${result.error.message || JSON.stringify(result.error)}`);
      }
      
      if (result.data && result.data.id) {
        console.log(`✅ Email sent successfully via Resend to ${params.to}, ID: ${result.data.id}`);
        return true;
      }
      
      console.warn(`⚠️ Resend returned no error but also no data ID`);
      throw new Error("Resend: No email ID returned");
      
    } catch (error: any) {
      console.error('❌ Resend email error:', error);
      
      // If it's a domain verification error, explain and fall back
      if (error?.error?.statusCode === 403) {
        console.error(`🚫 Resend domain verification issue detected.`);
        console.error(`Error: ${error.error?.error || 'Domain not verified'}`);
        console.error(`📧 Falling back to SendGrid for ${params.to}...`);
      } else {
        console.error(`📧 Resend failed for ${params.to}, falling back to SendGrid...`);
      }
    }
  } else {
    console.log(`⚠️ Resend not configured, trying SendGrid...`);
  }

  // Fallback to SendGrid
  if (!SENDGRID_API_KEY) {
    console.error("❌ Cannot send email: No SendGrid API key configured");
    return false;
  }
  
  console.log(`📧 Attempting to send email via SendGrid to ${params.to}...`);

  try {
    const emailData: any = {
      to: params.to,
      from: "w.ineza@alustudent.com", // Use your verified email address
      subject: params.subject,
    };
    
    if (params.html) emailData.html = params.html;
    if (params.text) emailData.text = params.text;
    
    await sgMail.send(emailData);
    console.log(`✅ Email sent successfully via SendGrid to ${params.to}`);
    return true;
  } catch (error: any) {
    // Handle SendGrid specific errors
    console.error('❌ SendGrid email error:', error);
    
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
    console.error(`From: ${params.from || "w.ineza@alustudent.com"}`);
    console.error(`Error: ${error.message || error}`);
    console.error(`SendGrid API Key configured: ${SENDGRID_API_KEY ? 'Yes' : 'No'}`);
    console.error(`Resend API Key configured: ${RESEND_API_KEY ? 'Yes' : 'No'}`);
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
  token?: string,
  baseUrl?: string
): { subject: string; html: string; text: string } {
  const frontendUrl = baseUrl || getFrontendUrl();
  const invitationUrl = `${frontendUrl}/accept-invitation/${token}`;
  
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
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
    .logo { width: 60px; height: 60px; object-fit: contain; margin-bottom: 15px; }
    .content { background: #f9fafb; padding: 30px; }
    .button { 
      display: inline-block !important; 
      background: #dc2626 !important; 
      background-color: #dc2626 !important;
      color: #ffffff !important; 
      padding: 15px 30px !important; 
      text-decoration: none !important; 
      border-radius: 6px !important; 
      margin: 20px 0 !important; 
      font-weight: bold !important; 
      font-size: 16px !important; 
      border: none !important;
      text-align: center !important;
      font-family: Arial, sans-serif !important;
    }
    .button:hover { background: #b91c1c !important; color: #ffffff !important; }
    .button:visited { color: #ffffff !important; }
    .button:active { color: #ffffff !important; }
    .button:link { color: #ffffff !important; }
    /* Force white text in all email clients */
    a.button { color: #ffffff !important; }
    a.button:link { color: #ffffff !important; }
    a.button:visited { color: #ffffff !important; }
    a.button:hover { color: #ffffff !important; }
    a.button:active { color: #ffffff !important; }
    .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 14px; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="text-align: center; margin-bottom: 15px;">
        <img src="${baseUrl || getFrontendUrl()}/logo.png" alt="Rindwa Logo" class="logo" />
      </div>
      <h1>🎉 You're Invited!</h1>
      <p style="margin: 10px 0 0 0; font-size: 18px;">Rindwa Emergency Management Platform</p>
    </div>
    <div class="content">
      <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome to Our Team!</h2>
      <p style="color: #4b5563;">Hello,</p>
      <p style="color: #4b5563;">You have been invited by <strong>${inviterName}</strong> to join the Rindwa Emergency Management Platform as a <strong>${role.replace('_', ' ')}</strong>.</p>
      
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