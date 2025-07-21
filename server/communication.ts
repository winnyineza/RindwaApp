import { Resend } from 'resend';
import twilio from 'twilio';

// Resend Email Configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Twilio SMS Configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const twilioClient = (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_ACCOUNT_SID.trim() && TWILIO_AUTH_TOKEN.trim()) 
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) 
  : null;

// Services configuration status available via health check endpoint

export interface EmailRequest {
  to: string;
  subject: string;
  body: string;
}

export interface SMSRequest {
  to: string;
  message: string;
}

export interface CommunicationResponse {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send email using Resend service
 */
export async function sendEmailMessage(request: EmailRequest): Promise<CommunicationResponse> {
  if (!resend) {
    return {
      success: false,
      error: 'Resend API key not configured'
    };
  }

  if (!request.to || !request.subject || !request.body) {
    return {
      success: false,
      error: 'Missing required fields: to, subject, or body'
    };
  }

  try {
    const result = await resend.emails.send({
      from: "Rindwa Emergency Platform <onboarding@resend.dev>",
      to: request.to,
      subject: request.subject,
      html: request.body,
    });

    console.log(`Email sent successfully to ${request.to}:`, result);
    
    return {
      success: true,
      id: result.data?.id || 'unknown'
    };
  } catch (error: any) {
    console.error('Resend email error:', error);
    return {
      success: false,
      error: error.message || 'Unknown email error'
    };
  }
}

/**
 * Send SMS using Twilio service
 */
export async function sendSMSMessage(request: SMSRequest): Promise<CommunicationResponse> {
  if (!twilioClient) {
    return {
      success: false,
      error: 'Twilio credentials not configured'
    };
  }

  if (!TWILIO_PHONE_NUMBER) {
    return {
      success: false,
      error: 'Twilio phone number not configured'
    };
  }

  if (!request.to || !request.message) {
    return {
      success: false,
      error: 'Missing required fields: to or message'
    };
  }

  try {
    const result = await twilioClient.messages.create({
      body: request.message,
      from: TWILIO_PHONE_NUMBER,
      to: request.to,
    });

    console.log(`SMS sent successfully to ${request.to}:`, result.sid);
    
    return {
      success: true,
      id: result.sid
    };
  } catch (error: any) {
    console.error('Twilio SMS error:', error);
    return {
      success: false,
      error: error.message || 'Unknown SMS error'
    };
  }
}

/**
 * Generate emergency notification email template
 */
export function generateEmergencyEmailTemplate(
  incidentTitle: string, 
  location: string, 
  priority: string,
  description?: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emergency Alert - Rindwa Platform</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .alert-box { background: #fef2f2; border: 2px solid #fca5a5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .priority-critical { background: #dc2626; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
    .priority-high { background: #f97316; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
    .priority-medium { background: #f59e0b; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
    .priority-low { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
    .location { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 EMERGENCY ALERT</h1>
      <p>Rindwa Emergency Management Platform</p>
    </div>
    <div class="content">
      <div class="alert-box">
        <h2 style="margin-top: 0; color: #dc2626;">Emergency Incident Reported</h2>
        <p><strong>Incident:</strong> ${incidentTitle}</p>
        <p><strong>Priority:</strong> <span class="priority-${priority.toLowerCase()}">${priority.toUpperCase()}</span></p>
        ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
      </div>
      
      <div class="location">
        <h3>📍 Location Details</h3>
        <p>${location}</p>
      </div>
      
      <p><strong>Time Reported:</strong> ${new Date().toLocaleString()}</p>
      
      <div style="background: #fffbeb; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <h3 style="color: #92400e; margin-top: 0;">Action Required</h3>
        <p>Please log into the Rindwa admin dashboard to review and respond to this emergency incident immediately.</p>
      </div>
      
      <div class="footer">
        <p>This is an automated emergency alert from Rindwa Emergency Management Platform</p>
        <p>Emergency incidents require immediate attention</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate emergency SMS message
 */
export function generateEmergencySMSMessage(
  incidentTitle: string,
  location: string,
  priority: string
): string {
  return `🚨 EMERGENCY ALERT - ${priority.toUpperCase()} PRIORITY
Incident: ${incidentTitle}
Location: ${location}
Time: ${new Date().toLocaleString()}
Please respond immediately via Rindwa dashboard.`;
}