interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export const createWelcomeEmail = (userName: string, organizationName: string): EmailTemplate => {
  return {
    subject: 'Welcome to Rindwa Emergency Management Platform',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Rindwa</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Rindwa</h1>
              <p>Emergency Management Platform</p>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>Welcome to the Rindwa Emergency Management Platform. You have been successfully added to <strong>${organizationName}</strong>.</p>
              
              <p>Our platform helps emergency services coordinate responses, manage incidents, and keep communities safe. Here's what you can do:</p>
              
              <ul>
                <li><strong>Manage Incidents:</strong> Create, assign, and track emergency incidents</li>
                <li><strong>Coordinate Response:</strong> Collaborate with your team effectively</li>
                <li><strong>Monitor Analytics:</strong> Track performance and response times</li>
                <li><strong>Community Engagement:</strong> Handle citizen reports and feedback</li>
              </ul>
              
              <p>To get started, simply log in to your account and explore the dashboard.</p>
              
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">Access Dashboard</a>
              
              <p>If you need help getting started, our support team is here to assist you.</p>
              
              <p>Best regards,<br>The Rindwa Team</p>
            </div>
            <div class="footer">
              <p>© 2024 Rindwa Emergency Management Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to Rindwa Emergency Management Platform!
      
      Hello ${userName}!
      
      Welcome to the Rindwa Emergency Management Platform. You have been successfully added to ${organizationName}.
      
      Our platform helps emergency services coordinate responses, manage incidents, and keep communities safe.
      
      What you can do:
      - Manage Incidents: Create, assign, and track emergency incidents
      - Coordinate Response: Collaborate with your team effectively
      - Monitor Analytics: Track performance and response times
      - Community Engagement: Handle citizen reports and feedback
      
      To get started, visit: ${process.env.FRONTEND_URL || 'http://localhost:5173'}
      
      If you need help getting started, our support team is here to assist you.
      
      Best regards,
      The Rindwa Team
    `
  };
};

export const createIncidentAssignmentEmail = (
  userName: string,
  incidentTitle: string,
  incidentId: number,
  priority: string,
  location: string
): EmailTemplate => {
  const priorityColor = priority === 'critical' ? '#dc2626' : priority === 'high' ? '#ea580c' : '#16a34a';
  
  return {
    subject: `Incident Assigned: ${incidentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Incident Assignment</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${priorityColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .incident-info { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .priority { display: inline-block; background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Incident Assignment</h1>
              <p>New incident has been assigned to you</p>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>A new incident has been assigned to you. Please review the details and take appropriate action.</p>
              
              <div class="incident-info">
                <h3>Incident Details</h3>
                <p><strong>Title:</strong> ${incidentTitle}</p>
                <p><strong>ID:</strong> #${incidentId}</p>
                <p><strong>Priority:</strong> <span class="priority">${priority}</span></p>
                <p><strong>Location:</strong> ${location}</p>
                <p><strong>Assigned:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <p>Please log in to the platform to view full incident details and begin your response.</p>
              
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/incidents/${incidentId}" class="button">View Incident</a>
              
              <p>Time is critical in emergency response. Please acknowledge receipt and begin your response as soon as possible.</p>
              
              <p>Best regards,<br>Rindwa Emergency Management</p>
            </div>
            <div class="footer">
              <p>© 2024 Rindwa Emergency Management Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Incident Assignment - ${incidentTitle}
      
      Hello ${userName}!
      
      A new incident has been assigned to you. Please review the details and take appropriate action.
      
      Incident Details:
      - Title: ${incidentTitle}
      - ID: #${incidentId}
      - Priority: ${priority.toUpperCase()}
      - Location: ${location}
      - Assigned: ${new Date().toLocaleString()}
      
      Please log in to the platform to view full incident details and begin your response.
      
      Visit: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/incidents/${incidentId}
      
      Time is critical in emergency response. Please acknowledge receipt and begin your response as soon as possible.
      
      Best regards,
      Rindwa Emergency Management
    `
  };
};

export const createPasswordResetEmail = (userName: string, resetToken: string): EmailTemplate => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-redirect/${resetToken}`;
  
  return {
    subject: 'Password Reset Request - Rindwa Platform',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
              <p>Reset your Rindwa account password</p>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>We received a request to reset your password for your Rindwa account.</p>
              
              <p>To reset your password, click the button below:</p>
              
              <a href="${resetUrl}" class="button">Reset Password</a>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              
              <div class="warning">
                <h3>Important Security Information:</h3>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Never share this link with anyone</li>
                  <li>Contact support if you have concerns</li>
                </ul>
              </div>
              
              <p>If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
              
              <p>Best regards,<br>The Rindwa Team</p>
            </div>
            <div class="footer">
              <p>© 2024 Rindwa Emergency Management Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Password Reset Request - Rindwa Platform
      
      Hello ${userName}!
      
      We received a request to reset your password for your Rindwa account.
      
      To reset your password, visit: ${resetUrl}
      
      Important Security Information:
      - This link will expire in 1 hour
      - If you didn't request this reset, please ignore this email
      - Never share this link with anyone
      - Contact support if you have concerns
      
      If you're having trouble with the link, copy and paste the URL above into your web browser.
      
      Best regards,
      The Rindwa Team
    `
  };
};

export const createIncidentUpdateEmail = (
  userName: string,
  incidentTitle: string,
  incidentId: number,
  oldStatus: string,
  newStatus: string,
  notes?: string
): EmailTemplate => {
  return {
    subject: `Incident Update: ${incidentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Incident Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .status-change { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #1e40af; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; }
            .status.resolved { background: #16a34a; color: white; }
            .status.in-progress { background: #ea580c; color: white; }
            .status.pending { background: #6b7280; color: white; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Incident Update</h1>
              <p>Status change notification</p>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>An incident you're involved with has been updated.</p>
              
              <div class="status-change">
                <h3>Status Update</h3>
                <p><strong>Incident:</strong> ${incidentTitle} (#${incidentId})</p>
                <p><strong>Status changed from:</strong> <span class="status ${oldStatus}">${oldStatus}</span> to <span class="status ${newStatus}">${newStatus}</span></p>
                <p><strong>Updated:</strong> ${new Date().toLocaleString()}</p>
                ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
              </div>
              
              <p>Click below to view the complete incident details:</p>
              
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/incidents/${incidentId}" class="button">View Incident</a>
              
              <p>Stay informed about incident progress and coordinate your response accordingly.</p>
              
              <p>Best regards,<br>Rindwa Emergency Management</p>
            </div>
            <div class="footer">
              <p>© 2024 Rindwa Emergency Management Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Incident Update: ${incidentTitle}
      
      Hello ${userName}!
      
      An incident you're involved with has been updated.
      
      Status Update:
      - Incident: ${incidentTitle} (#${incidentId})
      - Status changed from: ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()}
      - Updated: ${new Date().toLocaleString()}
      ${notes ? `- Notes: ${notes}` : ''}
      
      View incident details: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/incidents/${incidentId}
      
      Stay informed about incident progress and coordinate your response accordingly.
      
      Best regards,
      Rindwa Emergency Management
    `
  };
};