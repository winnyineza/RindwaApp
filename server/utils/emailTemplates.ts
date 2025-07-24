/**
 * Welcome Email Templates for Rindwa Emergency Platform
 */

export interface WelcomeEmailData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'citizen' | 'main_admin' | 'super_admin' | 'station_admin' | 'station_staff';
  organizationName?: string;
  stationName?: string;
}

/**
 * Generate welcome email for citizen users
 */
export function generateCitizenWelcomeEmail(userData: WelcomeEmailData): { subject: string; html: string; text: string } {
  const { firstName, lastName } = userData;
  const fullName = `${firstName} ${lastName}`;

  const subject = `🎉 Welcome to Rindwa Emergency Platform - Your Safety, Our Priority!`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Rindwa Emergency Platform</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .content { padding: 30px; }
          .welcome-message { background: #FEF2F2; border-left: 4px solid #DC2626; padding: 20px; margin: 20px 0; border-radius: 6px; }
          .features { background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .feature-item { display: flex; align-items: center; margin: 10px 0; }
          .feature-icon { background: #DC2626; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; }
          .cta-button { background: #DC2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin: 20px 0; }
          .emergency-numbers { background: #FEF3C7; border: 2px solid #F59E0B; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #1F2937; color: #9CA3AF; padding: 20px; text-align: center; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Rindwa!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Your Safety, Our Priority</p>
          </div>
          
          <div class="content">
            <div class="welcome-message">
              <h2 style="margin-top: 0; color: #DC2626;">Hello ${fullName}!</h2>
              <p style="margin: 0;">
                <strong>Thank you for joining the Rindwa Emergency Platform!</strong> 
                We're excited to have you as part of our community dedicated to keeping Rwanda safe and connected.
              </p>
            </div>
            
            <p>Your registration is complete, and you now have access to powerful emergency response tools right at your fingertips.</p>
            
            <div class="features">
              <h3 style="margin-top: 0; color: #374151;">🚀 What You Can Do Now:</h3>
              
              <div class="feature-item">
                <div class="feature-icon">🚨</div>
                <div>
                  <strong>Emergency Alerts:</strong> Send instant alerts to emergency services with your location
                </div>
              </div>
              
              <div class="feature-item">
                <div class="feature-icon">📱</div>
                <div>
                  <strong>Report Incidents:</strong> Easily report emergencies and incidents in your community
                </div>
              </div>
              
              <div class="feature-item">
                <div class="feature-icon">📍</div>
                <div>
                  <strong>Location Tracking:</strong> Your precise location is automatically shared with responders
                </div>
              </div>
              
              <div class="feature-item">
                <div class="feature-icon">🔔</div>
                <div>
                  <strong>Real-time Updates:</strong> Get updates on incidents and emergency responses in real-time
                </div>
              </div>
              
              <div class="feature-item">
                <div class="feature-icon">👥</div>
                <div>
                  <strong>Community Safety:</strong> Help make your community safer by reporting and tracking incidents
                </div>
              </div>
            </div>
            
            <div class="emergency-numbers">
              <h3 style="margin-top: 0; color: #92400E;">🚨 Remember These Emergency Numbers:</h3>
              <ul style="margin: 10px 0;">
                <li><strong>Police:</strong> 100</li>
                <li><strong>Fire:</strong> 101</li>
                <li><strong>Medical:</strong> 102</li>
                <li><strong>General Emergency:</strong> 112</li>
              </ul>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #92400E;">
                <strong>Note:</strong> For immediate life-threatening emergencies, always call emergency services directly.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" class="cta-button">Start Using Rindwa Mobile App</a>
            </div>
            
            <div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 20px; margin: 20px 0; border-radius: 6px;">
              <h4 style="margin-top: 0; color: #1D4ED8;">💡 Pro Tips for New Users:</h4>
              <ul style="margin: 10px 0; color: #1E40AF;">
                <li>Enable location services for faster emergency response</li>
                <li>Add emergency contacts in your profile</li>
                <li>Familiarize yourself with the app before emergencies occur</li>
                <li>Keep your phone charged and accessible</li>
              </ul>
            </div>
            
            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
              Questions or need help? Contact our support team anytime. We're here to ensure you get the most out of Rindwa Emergency Platform.
            </p>
          </div>
          
          <div class="footer">
            <p style="margin: 0 0 10px 0;">
              <strong>Rindwa Emergency Platform</strong> - Keeping Communities Safe
            </p>
            <p style="margin: 0;">
              © ${new Date().getFullYear()} Rindwa Emergency Platform. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Welcome to Rindwa Emergency Platform!
    
    Hello ${fullName}!
    
    Thank you for joining the Rindwa Emergency Platform! We're excited to have you as part of our community dedicated to keeping Rwanda safe and connected.
    
    Your registration is complete, and you now have access to powerful emergency response tools right at your fingertips.
    
    What You Can Do Now:
    🚨 Emergency Alerts: Send instant alerts to emergency services with your location
    📱 Report Incidents: Easily report emergencies and incidents in your community
    📍 Location Tracking: Your precise location is automatically shared with responders
    🔔 Real-time Updates: Get updates on incidents and emergency responses in real-time
    👥 Community Safety: Help make your community safer by reporting and tracking incidents
    
    Emergency Numbers to Remember:
    • Police: 100
    • Fire: 101
    • Medical: 102
    • General Emergency: 112
    
    Pro Tips for New Users:
    • Enable location services for faster emergency response
    • Add emergency contacts in your profile
    • Familiarize yourself with the app before emergencies occur
    • Keep your phone charged and accessible
    
    Questions or need help? Contact our support team anytime. We're here to ensure you get the most out of Rindwa Emergency Platform.
    
    Welcome aboard!
    
    © ${new Date().getFullYear()} Rindwa Emergency Platform. All rights reserved.
  `;

  return { subject, html, text };
}

/**
 * Generate welcome email for admin users (staff who accepted invitations)
 */
export function generateAdminWelcomeEmail(userData: WelcomeEmailData): { subject: string; html: string; text: string } {
  const { firstName, lastName, role, organizationName, stationName } = userData;
  const fullName = `${firstName} ${lastName}`;
  
  // Determine role display name
  const roleDisplayName = {
    'citizen': 'Citizen',
    'main_admin': 'Main Administrator',
    'super_admin': 'Super Administrator',
    'station_admin': 'Station Administrator',
    'station_staff': 'Station Staff Member'
  }[role] || 'Team Member';

  const subject = `🎉 Welcome to Rindwa Emergency Platform - Ready to Serve!`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Rindwa Emergency Platform</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .content { padding: 30px; }
          .welcome-message { background: #FEF2F2; border-left: 4px solid #DC2626; padding: 20px; margin: 20px 0; border-radius: 6px; }
          .role-info { background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 20px; margin: 20px 0; border-radius: 6px; }
          .capabilities { background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .capability-item { display: flex; align-items: center; margin: 10px 0; }
          .capability-icon { background: #DC2626; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; }
          .cta-button { background: #DC2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin: 20px 0; }
          .important-info { background: #FEF3C7; border: 2px solid #F59E0B; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #1F2937; color: #9CA3AF; padding: 20px; text-align: center; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Rindwa!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Emergency Response Team</p>
          </div>
          
          <div class="content">
            <div class="welcome-message">
              <h2 style="margin-top: 0; color: #DC2626;">Welcome ${fullName}!</h2>
              <p style="margin: 0;">
                <strong>Thank you for accepting your invitation to join the Rindwa Emergency Platform!</strong> 
                We're thrilled to have you as part of our dedicated emergency response team.
              </p>
            </div>
            
            <div class="role-info">
              <h3 style="margin-top: 0; color: #1D4ED8;">🎯 Your Role & Responsibilities</h3>
              <p style="margin: 5px 0;"><strong>Position:</strong> ${roleDisplayName}</p>
              ${organizationName ? `<p style="margin: 5px 0;"><strong>Organization:</strong> ${organizationName}</p>` : ''}
              ${stationName ? `<p style="margin: 5px 0;"><strong>Station:</strong> ${stationName}</p>` : ''}
              <p style="margin: 15px 0 0 0; color: #1E40AF;">
                You now have access to the administrative dashboard and emergency management tools needed to serve your community effectively.
              </p>
            </div>
            
            <div class="capabilities">
              <h3 style="margin-top: 0; color: #374151;">🛠️ Your Platform Capabilities:</h3>
              
              <div class="capability-item">
                <div class="capability-icon">📊</div>
                <div>
                  <strong>Dashboard Access:</strong> Monitor incidents, analytics, and system performance
                </div>
              </div>
              
              <div class="capability-item">
                <div class="capability-icon">🚨</div>
                <div>
                  <strong>Incident Management:</strong> Assign, track, and resolve emergency incidents
                </div>
              </div>
              
              <div class="capability-item">
                <div class="capability-icon">👥</div>
                <div>
                  <strong>Team Coordination:</strong> Collaborate with team members and manage assignments
                </div>
              </div>
              
              <div class="capability-item">
                <div class="capability-icon">📱</div>
                <div>
                  <strong>Real-time Notifications:</strong> Receive instant alerts for new incidents
                </div>
              </div>
              
              <div class="capability-item">
                <div class="capability-icon">📈</div>
                <div>
                  <strong>Analytics & Reports:</strong> Generate insights to improve emergency response
                </div>
              </div>
              
              <div class="capability-item">
                <div class="capability-icon">🔐</div>
                <div>
                  <strong>User Management:</strong> ${role.includes('admin') ? 'Invite and manage team members' : 'Update your profile and preferences'}
                </div>
              </div>
            </div>
            
            <div class="important-info">
              <h3 style="margin-top: 0; color: #92400E;">⚡ Quick Start Guide:</h3>
              <ol style="margin: 10px 0; color: #92400E;">
                <li><strong>Log in</strong> to your dashboard and complete your profile</li>
                <li><strong>Familiarize yourself</strong> with the incident management interface</li>
                <li><strong>Set up notifications</strong> to stay informed of new incidents</li>
                <li><strong>Review current incidents</strong> in your area of responsibility</li>
                <li><strong>Connect with your team</strong> and understand your workflow</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" class="cta-button">Access Your Dashboard</a>
            </div>
            
            <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 20px; margin: 20px 0; border-radius: 6px;">
              <h4 style="margin-top: 0; color: #065F46;">🤝 Team Support & Training:</h4>
              <p style="margin: 10px 0; color: #047857;">
                Our team is here to support you! If you have questions about your role, need technical assistance, 
                or require additional training, don't hesitate to reach out. Together, we can make our emergency 
                response system more effective and save lives.
              </p>
            </div>
            
            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
              Thank you for your commitment to serving our community. Your dedication to emergency response makes a real difference in people's lives.
            </p>
          </div>
          
          <div class="footer">
            <p style="margin: 0 0 10px 0;">
              <strong>Rindwa Emergency Platform</strong> - Professional Emergency Response
            </p>
            <p style="margin: 0;">
              © ${new Date().getFullYear()} Rindwa Emergency Platform. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Welcome to Rindwa Emergency Platform!
    
    Welcome ${fullName}!
    
    Thank you for accepting your invitation to join the Rindwa Emergency Platform! We're thrilled to have you as part of our dedicated emergency response team.
    
    Your Role & Responsibilities:
    Position: ${roleDisplayName}
    ${organizationName ? `Organization: ${organizationName}` : ''}
    ${stationName ? `Station: ${stationName}` : ''}
    
    You now have access to the administrative dashboard and emergency management tools needed to serve your community effectively.
    
    Your Platform Capabilities:
    📊 Dashboard Access: Monitor incidents, analytics, and system performance
    🚨 Incident Management: Assign, track, and resolve emergency incidents
    👥 Team Coordination: Collaborate with team members and manage assignments
    📱 Real-time Notifications: Receive instant alerts for new incidents
    📈 Analytics & Reports: Generate insights to improve emergency response
    🔐 User Management: ${role.includes('admin') ? 'Invite and manage team members' : 'Update your profile and preferences'}
    
    Quick Start Guide:
    1. Log in to your dashboard and complete your profile
    2. Familiarize yourself with the incident management interface
    3. Set up notifications to stay informed of new incidents
    4. Review current incidents in your area of responsibility
    5. Connect with your team and understand your workflow
    
    Team Support & Training:
    Our team is here to support you! If you have questions about your role, need technical assistance, or require additional training, don't hesitate to reach out. Together, we can make our emergency response system more effective and save lives.
    
    Thank you for your commitment to serving our community. Your dedication to emergency response makes a real difference in people's lives.
    
    © ${new Date().getFullYear()} Rindwa Emergency Platform. All rights reserved.
  `;

  return { subject, html, text };
}

/**
 * Send welcome email based on user type
 */
export async function sendWelcomeEmail(userData: WelcomeEmailData, sendEmailFunction: any): Promise<boolean> {
  try {
    const emailTemplate = userData.role === 'citizen' 
      ? generateCitizenWelcomeEmail(userData)
      : generateAdminWelcomeEmail(userData);

    const success = await sendEmailFunction({
      to: userData.email,
      from: "onboarding@resend.dev", // Or your configured sender
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });

    if (success) {
      console.log(`✅ Welcome email sent successfully to ${userData.email} (${userData.role})`);
      return true;
    } else {
      console.error(`❌ Failed to send welcome email to ${userData.email}`);
      return false;
    }
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
} 