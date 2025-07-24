import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { sequelize } from "./db";
import { QueryTypes } from "sequelize";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User, Incident, UserAttributes, IncidentAttributes } from "@shared/models";
import { z } from "zod";
import { sendEmail, generateInvitationEmail } from "./email";
import { 
  sendEmailMessage, 
  sendSMSMessage, 
  generateEmergencyEmailTemplate, 
  generateEmergencySMSMessage,
  type EmailRequest,
  type SMSRequest 
} from "./communication";
import { sendWelcomeEmail, type WelcomeEmailData } from "./utils/emailTemplates";
import { 
  userLoginSchema,
  userRegistrationSchema,
  incidentCreationSchema,
  organizationCreationSchema,
  stationCreationSchema,
  invitationCreationSchema,
  validateRequest
} from "../shared/validations";
import { EscalationService } from "./services/escalationService";
import { PerformanceService } from "./services/performanceService";
import { FollowUpService } from "./services/followUpService";
import { PushNotificationService } from "./services/pushNotificationService";
import multer from "multer";
import path from "path";
import fs from "fs";
import logger, { logAuditEvent, logDetailedError, createErrorResponse } from "./utils/logger";
import { 
  authRateLimiter, 
  validateInput, 
  loginValidation, 
  incidentValidation, 
  userValidation 
} from "./middleware/security";
import { cache, withCache } from "./utils/cache";
import { body, validationResult } from "express-validator";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Active WebSocket connections for real-time notifications
const activeConnections = new Map<string, any>();

// Helper function to send notifications for incident events
async function sendIncidentNotification(incident: any, eventType: string, user: any, storage: any) {
  try {
    const notifications = [];
    
    switch (eventType) {
      case 'created':
        // Notify station admins and super admins
        if (incident.stationId) {
          const stationAdmins = await storage.getUsersByRole('station_admin');
          const stationUsers = stationAdmins.filter((admin: any) => admin.stationId === incident.stationId);
          
          for (const admin of stationUsers) {
            notifications.push({
              userId: admin.id,
              type: 'info',
              title: 'New Incident Reported',
              message: `New ${incident.priority} priority incident: ${incident.title}`,
              relatedEntityType: 'incident',
              relatedEntityId: incident.id,
              actionRequired: true
            });
          }
        }
        break;
        
      case 'assigned':
        // Notify the assigned user
        if (incident.assignedToId) {
          notifications.push({
            userId: incident.assignedToId,
            type: 'info',
            title: 'Incident Assigned to You',
            message: `You have been assigned to incident: ${incident.title}`,
            relatedEntityType: 'incident',
            relatedEntityId: incident.id,
            actionRequired: true
          });
        }
        break;
        
      case 'self_assigned':
        // Notify station admin about self-assignment
        if (incident.stationId) {
          const stationAdmins = await storage.getUsersByRole('station_admin');
          const stationUsers = stationAdmins.filter((admin: any) => admin.stationId === incident.stationId);
          
          for (const admin of stationUsers) {
            if (admin.id !== user.userId) {
              notifications.push({
                userId: admin.id,
                type: 'info',
                title: 'Staff Self-Assigned Incident',
                message: `${user.firstName} ${user.lastName} has self-assigned incident: ${incident.title}`,
                relatedEntityType: 'incident',
                relatedEntityId: incident.id,
                actionRequired: false
              });
            }
          }
        }
        break;
        
      case 'updated':
        // Notify involved parties about status/priority changes
        const notifyUsers = [];
        
        // Notify assigned user
        if (incident.assignedToId) {
          notifyUsers.push(incident.assignedToId);
        }
        
        // Notify station admins
        if (incident.stationId) {
          const stationAdmins = await storage.getUsersByRole('station_admin');
          const stationUsers = stationAdmins.filter((admin: any) => admin.stationId === incident.stationId);
          notifyUsers.push(...stationUsers.map((admin: any) => admin.id));
        }
        
        // Remove duplicates and current user
        const uniqueUsers = [...new Set(notifyUsers)].filter(id => id !== user.userId);
        
        for (const userId of uniqueUsers) {
          notifications.push({
            userId,
            type: 'info',
            title: 'Incident Updated',
            message: `Incident "${incident.title}" has been updated`,
            relatedEntityType: 'incident',
            relatedEntityId: incident.id,
            actionRequired: false
          });
        }
        break;
    }
    
    // Create notifications and send via WebSocket
    for (const notifData of notifications) {
      const notification = await storage.createNotification(notifData);
      
      // Send real-time notification via WebSocket
      const ws = activeConnections.get(notification.userId);
      if (ws && ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify({
          type: 'new_notification',
          notification
        }));
      }
    }
  } catch (error) {
    console.error('Error sending incident notification:', error);
  }
}

// Helper function to send user management notifications
async function sendUserNotification(targetUserId: string, eventType: string, eventData: any, storage: any) {
  try {
    let notification;
    
    switch (eventType) {
      case 'invitation_sent':
        notification = {
          userId: targetUserId,
          type: 'info',
          title: 'New Invitation Sent',
          message: `An invitation has been sent to ${eventData.email} for ${eventData.role} role`,
          relatedEntityType: 'invitation',
          relatedEntityId: eventData.id,
          actionRequired: false
        };
        break;
        
      case 'invitation_accepted':
        notification = {
          userId: targetUserId,
          type: 'success',
          title: 'Invitation Accepted',
          message: `${eventData.inviteeName} (${eventData.inviteeEmail}) has accepted your invitation${eventData.organizationName ? ' for ' + eventData.organizationName : ''}${eventData.stationName ? ' - ' + eventData.stationName : ''}`,
          relatedEntityType: 'invitation',
          relatedEntityId: null,
          actionRequired: false
        };
        break;
        
      case 'user_updated':
      case 'profile_updated':
        notification = {
          userId: targetUserId,
          type: 'info',
          title: 'Profile Updated',
          message: `Your profile has been updated${eventData.updatedBy ? ' by ' + eventData.updatedBy : ''}`,
          relatedEntityType: 'user',
          relatedEntityId: eventData.userId,
          actionRequired: false
        };
        break;
        
      case 'user_deleted':
        notification = {
          userId: targetUserId,
          type: 'warning',
          title: 'User Account Deleted',
          message: `User account for ${eventData.userName} has been deleted`,
          relatedEntityType: 'user',
          relatedEntityId: eventData.userId,
          actionRequired: false
        };
        break;
        
      case 'role_changed':
        notification = {
          userId: targetUserId,
          type: 'warning',
          title: 'Role Changed',
          message: `Your role has been changed to ${eventData.newRole}${eventData.updatedBy ? ' by ' + eventData.updatedBy : ''}`,
          relatedEntityType: 'user',
          relatedEntityId: eventData.userId,
          actionRequired: true
        };
        break;
        
      case 'user_migrated':
        notification = {
          userId: targetUserId,
          type: 'info',
          title: 'Station Migration',
          message: `You have been migrated to ${eventData.newStationName}${eventData.updatedBy ? ' by ' + eventData.updatedBy : ''}`,
          relatedEntityType: 'user',
          relatedEntityId: eventData.userId,
          actionRequired: true
        };
        break;
        
      case 'password_reset_requested':
        notification = {
          userId: targetUserId,
          type: 'warning',
          title: 'Password Reset Request',
          message: `A password reset was requested for your account from ${eventData.ip || 'unknown location'}`,
          relatedEntityType: 'user',
          relatedEntityId: eventData.userId,
          actionRequired: false
        };
        break;
        
      case 'emergency_contact_updated':
        notification = {
          userId: targetUserId,
          type: 'info',
          title: 'Emergency Contact Updated',
          message: `Your emergency contacts have been updated`,
          relatedEntityType: 'user',
          relatedEntityId: eventData.userId,
          actionRequired: false
        };
        break;
        
      case 'user_created':
        notification = {
          userId: targetUserId,
          type: 'info',
          title: 'New User Created',
          message: `New user ${eventData.userName} (${eventData.userEmail}) created as ${eventData.userRole}${eventData.createdBy ? ' by ' + eventData.createdBy : ''}`,
          relatedEntityType: 'user',
          relatedEntityId: eventData.userId,
          actionRequired: false
        };
        break;
        
      case 'failed_login_attempt':
        notification = {
          userId: targetUserId,
          type: 'error',
          title: 'Failed Login Attempt',
          message: `Failed login attempt for ${eventData.email} from ${eventData.ip}`,
          relatedEntityType: 'security',
          relatedEntityId: null,
          actionRequired: true
        };
        break;
    }
    
    if (notification) {
      const createdNotification = await storage.createNotification(notification);
      
      // Send real-time notification via WebSocket
      const ws = activeConnections.get(targetUserId);
      if (ws && ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify({
          type: 'new_notification',
          notification: createdNotification
        }));
      }
    }
  } catch (error) {
    console.error('Error sending user notification:', error);
  }
}

// Helper function to send station notifications
async function sendStationNotification(station: any, eventType: string, user: any, storage: any) {
  try {
    const notifications = [];
    
    let notification;
    const organization = await storage.getOrganization(station.organizationId);
    const organizationName = organization?.name || 'Unknown Organization';
    
    switch (eventType) {
      case 'created':
        // Notify Main Admin
        const mainAdmins = await storage.getUsersByRole('main_admin');
        for (const admin of mainAdmins) {
          notification = {
            userId: admin.id,
            type: 'info',
            title: 'New Station Created',
            message: `${user.firstName} ${user.lastName} created a new station: ${station.name} at ${organizationName}`,
            relatedEntityType: 'station',
            relatedEntityId: station.id,
            actionRequired: false
          };
          
          const createdNotification = await storage.createNotification(notification);
          
          // Send real-time notification via WebSocket
          const ws = activeConnections.get(admin.id);
          if (ws && ws.readyState === 1) { // WebSocket.OPEN
            ws.send(JSON.stringify({
              type: 'new_notification',
              notification: createdNotification
            }));
          }
        }
        
        // Notify other Super Admins in the same organization
        const superAdmins = await storage.getUsersByOrganization(station.organizationId);
        for (const admin of superAdmins) {
          if (admin.role === 'super_admin' && admin.id !== user.userId) {
            notification = {
              userId: admin.id,
              type: 'info',
              title: 'New Station Created',
              message: `${user.firstName} ${user.lastName} created a new station: ${station.name} in your organization`,
              relatedEntityType: 'station',
              relatedEntityId: station.id,
              actionRequired: false
            };
            
            const createdNotification = await storage.createNotification(notification);
            
            // Send real-time notification via WebSocket
            const ws = activeConnections.get(admin.id);
            if (ws && ws.readyState === 1) { // WebSocket.OPEN
              ws.send(JSON.stringify({
                type: 'new_notification',
                notification: createdNotification
              }));
            }
          }
        }
        break;
        
      case 'updated':
        // Notify relevant users about station updates
        const allAdmins = await storage.getUsersByRole('main_admin');
        const orgAdmins = await storage.getUsersByOrganization(station.organizationId);
        const stationUsers = station.id ? await storage.getUsersByStation(station.id) : [];
        
        // Notify Main Admins
        for (const admin of allAdmins) {
          if (admin.id !== user.userId) {
            notification = {
              userId: admin.id,
              type: 'info',
              title: 'Station Updated',
              message: `Station "${station.name}" has been updated by ${user.firstName} ${user.lastName}`,
              relatedEntityType: 'station',
              relatedEntityId: station.id,
              actionRequired: false
            };
            
            const createdNotification = await storage.createNotification(notification);
            
            const ws = activeConnections.get(admin.id);
            if (ws && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'new_notification',
                notification: createdNotification
              }));
            }
          }
        }
        
        // Notify Organization Super Admins
        for (const admin of orgAdmins) {
          if (admin.role === 'super_admin' && admin.id !== user.userId) {
            notification = {
              userId: admin.id,
              type: 'info',
              title: 'Station Updated',
              message: `Station "${station.name}" in your organization has been updated`,
              relatedEntityType: 'station',
              relatedEntityId: station.id,
              actionRequired: false
            };
            
            const createdNotification = await storage.createNotification(notification);
            
            const ws = activeConnections.get(admin.id);
            if (ws && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'new_notification',
                notification: createdNotification
              }));
            }
          }
        }
        
        // Notify Station Staff
        for (const staff of stationUsers) {
          if (staff.id !== user.userId) {
            notification = {
              userId: staff.id,
              type: 'info',
              title: 'Station Updated',
              message: `Your station "${station.name}" has been updated`,
              relatedEntityType: 'station',
              relatedEntityId: station.id,
              actionRequired: false
            };
            
            const createdNotification = await storage.createNotification(notification);
            
            const ws = activeConnections.get(staff.id);
            if (ws && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'new_notification',
                notification: createdNotification
              }));
            }
          }
        }
        break;
        
      case 'deleted':
        // Notify all relevant users about station deletion
        const allAdminsDelete = await storage.getUsersByRole('main_admin');
        const orgAdminsDelete = await storage.getUsersByOrganization(station.organizationId);
        const stationUsersDelete = station.id ? await storage.getUsersByStation(station.id) : [];
        
        const allRelevantUsers = [...allAdminsDelete, ...orgAdminsDelete, ...stationUsersDelete];
        
        for (const targetUser of allRelevantUsers) {
          if (targetUser.id !== user.userId) {
            notification = {
              userId: targetUser.id,
              type: 'warning',
              title: 'Station Deleted',
              message: `Station "${station.name}" has been deleted by ${user.firstName} ${user.lastName}`,
              relatedEntityType: 'station',
              relatedEntityId: station.id,
              actionRequired: targetUser.stationId === station.id
            };
            
            const createdNotification = await storage.createNotification(notification);
            
            const ws = activeConnections.get(targetUser.id);
            if (ws && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'new_notification',
                notification: createdNotification
              }));
            }
          }
        }
        break;
        
      case 'staff_assignment_changed':
        // Notify about staff assignment changes
        const stationStaff = station.id ? await storage.getUsersByStation(station.id) : [];
        
        for (const staff of stationStaff) {
          if (staff.id !== user.userId) {
            notification = {
              userId: staff.id,
              type: 'info',
              title: 'Staff Assignment Changed',
              message: `Staff assignments for "${station.name}" have been updated`,
              relatedEntityType: 'station',
              relatedEntityId: station.id,
              actionRequired: false
            };
            
            const createdNotification = await storage.createNotification(notification);
            
            const ws = activeConnections.get(staff.id);
            if (ws && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'new_notification',
                notification: createdNotification
              }));
            }
          }
        }
        break;
    }
  } catch (error) {
    console.error('Error sending station notification:', error);
  }
}

// Helper function to send organization notifications
async function sendOrganizationNotification(organization: any, eventType: string, user: any, storage: any) {
  try {
    let notification;
    
    switch (eventType) {
      case 'created':
        // Notify Main Admins
        const mainAdmins = await storage.getUsersByRole('main_admin');
        for (const admin of mainAdmins) {
          if (admin.id !== user.userId) {
            notification = {
              userId: admin.id,
              type: 'info',
              title: 'New Organization Created',
              message: `Organization "${organization.name}" has been created by ${user.firstName} ${user.lastName}`,
              relatedEntityType: 'organization',
              relatedEntityId: organization.id,
              actionRequired: false
            };
            
            const createdNotification = await storage.createNotification(notification);
            
            const ws = activeConnections.get(admin.id);
            if (ws && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'new_notification',
                notification: createdNotification
              }));
            }
          }
        }
        break;
        
      case 'updated':
        // Notify Main Admins and Organization Super Admins
        const allMainAdmins = await storage.getUsersByRole('main_admin');
        const orgUsers = await storage.getUsersByOrganization(organization.id);
        
        // Notify Main Admins
        for (const admin of allMainAdmins) {
          if (admin.id !== user.userId) {
            notification = {
              userId: admin.id,
              type: 'info',
              title: 'Organization Updated',
              message: `Organization "${organization.name}" has been updated by ${user.firstName} ${user.lastName}`,
              relatedEntityType: 'organization',
              relatedEntityId: organization.id,
              actionRequired: false
            };
            
            const createdNotification = await storage.createNotification(notification);
            
            const ws = activeConnections.get(admin.id);
            if (ws && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'new_notification',
                notification: createdNotification
              }));
            }
          }
        }
        
        // Notify Organization Super Admins
        for (const orgUser of orgUsers) {
          if (orgUser.role === 'super_admin' && orgUser.id !== user.userId) {
            notification = {
              userId: orgUser.id,
              type: 'info',
              title: 'Organization Updated',
              message: `Your organization "${organization.name}" has been updated`,
              relatedEntityType: 'organization',
              relatedEntityId: organization.id,
              actionRequired: false
            };
            
            const createdNotification = await storage.createNotification(notification);
            
            const ws = activeConnections.get(orgUser.id);
            if (ws && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'new_notification',
                notification: createdNotification
              }));
            }
          }
        }
        break;
        
      case 'deleted':
        // Notify all users affected by organization deletion
        const allUsers = await storage.getUsersByOrganization(organization.id);
        const mainAdminsDelete = await storage.getUsersByRole('main_admin');
        
        // Notify Main Admins
        for (const admin of mainAdminsDelete) {
          if (admin.id !== user.userId) {
            notification = {
              userId: admin.id,
              type: 'warning',
              title: 'Organization Deleted',
              message: `Organization "${organization.name}" has been deleted by ${user.firstName} ${user.lastName}`,
              relatedEntityType: 'organization',
              relatedEntityId: organization.id,
              actionRequired: false
            };
            
            const createdNotification = await storage.createNotification(notification);
            
            const ws = activeConnections.get(admin.id);
            if (ws && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'new_notification',
                notification: createdNotification
              }));
            }
          }
        }
        
        // Notify all organization users
        for (const orgUser of allUsers) {
          if (orgUser.id !== user.userId) {
            notification = {
              userId: orgUser.id,
              type: 'error',
              title: 'Organization Deleted',
              message: `Your organization "${organization.name}" has been deleted`,
              relatedEntityType: 'organization',
              relatedEntityId: organization.id,
              actionRequired: true
            };
            
            const createdNotification = await storage.createNotification(notification);
            
            const ws = activeConnections.get(orgUser.id);
            if (ws && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'new_notification',
                notification: createdNotification
              }));
            }
          }
        }
        break;
    }
  } catch (error) {
    console.error('Error sending organization notification:', error);
  }
}

// Helper function to send system notifications
async function sendSystemNotification(eventType: string, eventData: any, storage: any) {
  try {
    const mainAdmins = await storage.getUsersByRole('main_admin');
    const superAdmins = await storage.getUsersByRole('super_admin');
    
    let notification;
    
    switch (eventType) {
      case 'audit_log_accessed':
        // Notify main admins about audit log access
        for (const admin of mainAdmins) {
          if (admin.id !== eventData.accessedBy) {
            notification = {
              userId: admin.id,
              type: 'info',
              title: 'Audit Log Accessed',
              message: `Audit logs accessed by ${eventData.userName}`,
              relatedEntityType: 'audit',
              relatedEntityId: null,
              actionRequired: false
            };
            
            const createdNotification = await storage.createNotification(notification);
            
            const ws = activeConnections.get(admin.id);
            if (ws && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'new_notification',
                notification: createdNotification
              }));
            }
          }
        }
        break;
        
      case 'data_export_performed':
        // Notify main admins about data exports
        for (const admin of mainAdmins) {
          if (admin.id !== eventData.exportedBy) {
            notification = {
              userId: admin.id,
              type: 'warning',
              title: 'Data Export Performed',
              message: `Data export performed by ${eventData.userName}: ${eventData.exportType}`,
              relatedEntityType: 'export',
              relatedEntityId: null,
              actionRequired: false
            };
            
            const createdNotification = await storage.createNotification(notification);
            
            const ws = activeConnections.get(admin.id);
            if (ws && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'new_notification',
                notification: createdNotification
              }));
            }
          }
        }
        break;
        
      case 'system_backup_completed':
        // Notify main admins about successful backups
        for (const admin of mainAdmins) {
          notification = {
            userId: admin.id,
            type: 'info',
            title: 'System Backup Completed',
            message: `System backup completed successfully at ${new Date().toLocaleString()}`,
            relatedEntityType: 'system',
            relatedEntityId: null,
            actionRequired: false
          };
          
          const createdNotification = await storage.createNotification(notification);
          
          const ws = activeConnections.get(admin.id);
          if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({
              type: 'new_notification',
              notification: createdNotification
            }));
          }
        }
        break;
        
      case 'system_backup_failed':
        // Notify main admins about failed backups
        for (const admin of mainAdmins) {
          notification = {
            userId: admin.id,
            type: 'error',
            title: 'System Backup Failed',
            message: `System backup failed: ${eventData.error}`,
            relatedEntityType: 'system',
            relatedEntityId: null,
            actionRequired: true
          };
          
          const createdNotification = await storage.createNotification(notification);
          
          const ws = activeConnections.get(admin.id);
          if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({
              type: 'new_notification',
              notification: createdNotification
            }));
          }
        }
        break;
        
      case 'emergency_alert_triggered':
        // Notify all administrators about emergency alerts
        const allAdmins = [...mainAdmins, ...superAdmins];
        const stationAdmins = await storage.getUsersByRole('station_admin');
        allAdmins.push(...stationAdmins);
        
        for (const admin of allAdmins) {
          notification = {
            userId: admin.id,
            type: 'error',
            title: 'Emergency Alert Triggered',
            message: `Emergency alert triggered: ${eventData.alertType} by ${eventData.userName}`,
            relatedEntityType: 'emergency',
            relatedEntityId: null,
            actionRequired: true
          };
          
          const createdNotification = await storage.createNotification(notification);
          
          const ws = activeConnections.get(admin.id);
          if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({
              type: 'new_notification',
              notification: createdNotification
            }));
          }
        }
        break;
    }
  } catch (error) {
    console.error('Error sending system notification:', error);
  }
}

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Audit logging middleware
const auditLogger = (action: string, entityType: string, entityId?: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Override response methods to log after successful operations
    res.send = function(data) {
      logAuditEntry(req, action, entityType, entityId?.toString(), res.statusCode);
      return originalSend.call(this, data);
    };
    
    res.json = function(data) {
      logAuditEntry(req, action, entityType, entityId?.toString(), res.statusCode);
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Helper function to log audit entries
async function logAuditEntry(req: Request, action: string, entityType: string, entityId?: string, statusCode?: number) {
  try {
    if (statusCode && statusCode < 400) {
      const auditData = {
        userId: req.user?.userId || undefined, // Allow undefined for anonymous citizen activities
        action: action as any,
        resourceType: entityType,
        resourceId: entityId,
        details: {
          method: req.method,
          url: req.originalUrl,
          body: req.body,
          params: req.params,
          statusCode,
          userType: req.user ? 'authenticated' : 'anonymous_citizen'
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined
      };
      
      await storage.createAuditLog(auditData);
    }
  } catch (error) {
    // Silent fail for audit logs to not break main functionality
    console.error('Audit log error:', error);
  }
}

// WebSocket connections for real-time notifications (declared above at line 30)

// Helper functions for analytics
function calculateAverageResponseTime(incidents: any[]): number {
  if (incidents.length === 0) return 0;
  
  const responseTimes = incidents
    .filter(i => i.status !== 'pending' && i.created_at && i.updated_at)
    .map(i => {
      const created = new Date(i.created_at).getTime();
      const updated = new Date(i.updated_at).getTime();
      return (updated - created) / (1000 * 60); // minutes
    });
  
  return responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;
}

function calculateDailyTrends(incidents: any[], startDate: Date, endDate: Date): any[] {
  const trends = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayIncidents = incidents.filter(i => {
      const incidentDate = new Date(i.created_at);
      return incidentDate.toDateString() === currentDate.toDateString();
    });
    
    trends.push({
      date: currentDate.toISOString().split('T')[0],
      incidents: dayIncidents.length,
      resolved: dayIncidents.filter(i => i.status === 'resolved').length,
      critical: dayIncidents.filter(i => i.priority === 'critical').length
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return trends;
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string;
        email: string;
        role: string;
        organisationId?: string;  // Use British spelling to match database
        stationId?: string;
        organizationId?: string;  // Keep for backward compatibility
      };
    }
  }
}

// Middleware to verify JWT token
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Role-based access control middleware
const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize escalation service
  const escalationService = new EscalationService(storage);
  
  // Start auto-escalation scheduler
  escalationService.startAutoEscalationScheduler();
  
  // Auth routes
  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     tags: [Authentication]
   *     summary: Authenticate user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LoginResponse'
   *       401:
   *         description: Invalid credentials
   *       429:
   *         description: Too many login attempts
   */
  app.post("/api/auth/login", 
    authRateLimiter,
    async (req: Request, res: Response) => {
    try {
      // Validate request using shared schema
      const validation = validateRequest(userLoginSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validation.errors 
        });
      }
      
      const { email, password } = validation.data!
      
      // Direct database query to bypass Sequelize model issues - include organizational context
      const result = await sequelize.query(
        'SELECT id, email, password, "firstName", "lastName", role, "isActive", "organisationId", "stationId" FROM users WHERE email = :email AND "isActive" = true',
        {
          replacements: { email },
          type: QueryTypes.SELECT
        }
      );
      
      const user = result[0] as any;
      if (!user || !user.password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Update last login
      await sequelize.query(
        'UPDATE users SET "lastLoginAt" = NOW() WHERE id = :userId',
        {
          replacements: { userId: user.id },
          type: QueryTypes.UPDATE
        }
      );

      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organisationId: user.organisationId, // Include organizational context
          stationId: user.stationId,           // Include station context
          organizationName: null,
          stationName: null
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Skip audit log for now due to schema issues
      // await storage.createAuditLog(...);

      // Get organization and station information
      let organisation = null;
      let station = null;
      
      if (user.organisationId) {
        const orgResult = await sequelize.query(
          'SELECT id, name FROM organizations WHERE id = :orgId',
          {
            replacements: { orgId: user.organisationId },
            type: QueryTypes.SELECT
          }
        );
        if (orgResult.length > 0) {
          const org = orgResult[0] as any;
          organisation = { id: org.id, name: org.name };
        }
      }
      
      if (user.stationId) {
        const stationResult = await sequelize.query(
          'SELECT id, name FROM stations WHERE id = :stationId',
          {
            replacements: { stationId: user.stationId },
            type: QueryTypes.SELECT
          }
        );
        if (stationResult.length > 0) {
          const stat = stationResult[0] as any;
          station = { id: stat.id, name: stat.name };
        }
      }

      res.json({ 
        token, 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organisationId: user.organisationId,
          stationId: user.stationId,
          organisation,
          station,
          isActive: user.isActive
        }
      });
    } catch (error) {
      console.error('Login error details:', error);
      console.error('Login error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ message: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      // Validate request using shared schema
      const validation = validateRequest(userRegistrationSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validation.errors 
        });
      }
      
      const userData = validation.data!
      
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      if (!userData.password) {
        return res.status(400).json({ message: 'Password is required' });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        updatedAt: new Date(),
        isActive: true,
        isInvited: false
      });

      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organisationId,
          stationId: user.stationId
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Log user registration
      await storage.createAuditLog({
        userId: user.id,
        action: 'register',
        resourceType: 'user',
        resourceId: user.id,
        details: JSON.stringify({
          email: user.email,
          role: user.role,
          registrationTime: new Date().toISOString(),
          userAgent: req.get('user-agent') || undefined
        }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined
      });

      // Send welcome email to new citizen
      try {
        const welcomeEmailData: WelcomeEmailData = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role as 'citizen' | 'main_admin' | 'super_admin' | 'station_admin' | 'station_staff'
        };
        
        await sendWelcomeEmail(welcomeEmailData, sendEmail);
        console.log(`✅ Welcome email sent to new citizen: ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send welcome email to citizen:', emailError);
        // Don't fail the registration if email fails
      }

      res.json({ 
        token, 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organisationId,
          stationId: user.stationId
        }
      });
    } catch (error) {
      console.error('Registration error details:', error);
      console.error('Registration error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Organization routes
  app.get("/api/organizations", authenticateToken, requireRole(['main_admin']), async (req: Request, res: Response) => {
    try {
      const organizations = await sequelize.query(
        'SELECT * FROM organisations ORDER BY created_at DESC',
        {
          type: QueryTypes.SELECT
        }
      );
      res.json(organizations);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post("/api/organizations", authenticateToken, requireRole(['main_admin']), async (req: Request, res: Response) => {
    try {
      const { name, type, description, email, phone, address, city, country, website } = req.body;
      
      // Generate a unique code based on name with timestamp to avoid duplicates
      const baseCode = name.replace(/\s+/g, '').substring(0, 8).toUpperCase();
      const code = `${baseCode}_${Date.now().toString().slice(-4)}`;
      
      const result = await sequelize.query(
        `INSERT INTO organisations (
          id, name, code, type, description, user_id, address, city, country, phone, email, website, timezone, is_active, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), :name, :code, :type, :description, :user_id, :address, :city, :country, :phone, :email, :website, :timezone, :is_active, NOW(), NOW()
        ) RETURNING *`,
        {
          replacements: { 
            name, 
            code,
            type, 
            description: description || null,
            user_id: req.user.userId,
            address: address || 'TBD',
            city: city || 'TBD',
            country: country || 'Rwanda',
            phone: phone || '+250 000 000 000',
            email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@rindwa.rw`,
            website: website || null,
            timezone: 'Africa/Kigali',
            is_active: true
          },
          type: QueryTypes.SELECT
        }
      );
      
      const organization = result[0];
      res.json(organization);
    } catch (error) {
      console.error('Organization creation error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.put("/api/organizations/:id", authenticateToken, requireRole(['main_admin']), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, type, email, phone, address, city, country, website, description } = req.body;
      
      // Build dynamic update query based on provided fields
      const updateFields = [];
      const replacements: any = { id };
      
      if (name !== undefined) {
        updateFields.push('name = :name');
        replacements.name = name;
      }
      if (type !== undefined) {
        updateFields.push('type = :type');
        replacements.type = type;
      }
      if (email !== undefined) {
        updateFields.push('email = :email');
        replacements.email = email;
      }
      if (phone !== undefined) {
        updateFields.push('phone = :phone');
        replacements.phone = phone;
      }
      if (address !== undefined) {
        updateFields.push('address = :address');
        replacements.address = address;
      }
      if (city !== undefined) {
        updateFields.push('city = :city');
        replacements.city = city;
      }
      if (country !== undefined) {
        updateFields.push('country = :country');
        replacements.country = country;
      }
      if (website !== undefined) {
        updateFields.push('website = :website');
        replacements.website = website;
      }
      if (description !== undefined) {
        updateFields.push('description = :description');
        replacements.description = description;
      }
      
      // Add updated_at timestamp
      updateFields.push('updated_at = NOW()');
      
      if (updateFields.length === 1) {
        // Only updated_at was added, no actual fields to update
        return res.status(400).json({ message: 'No valid fields to update' });
      }
      
      // Direct database query to update organization
      const updateResult = await sequelize.query(
        `UPDATE organisations SET ${updateFields.join(', ')} WHERE id = :id`,
        {
          replacements,
          type: QueryTypes.UPDATE
        }
      );
      
      // Check if any rows were affected
      if (updateResult[1] === 0) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      
      // Get updated organization
      const result = await sequelize.query(
        'SELECT * FROM organisations WHERE id = :id',
        {
          replacements: { id },
          type: QueryTypes.SELECT
        }
      );
      
      const organization = result[0];
      res.json(organization);
    } catch (error) {
      console.error('Organization update error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete("/api/organizations/:id", authenticateToken, requireRole(['main_admin']), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Check if organization exists using direct query
      const checkResult = await sequelize.query(
        'SELECT * FROM organisations WHERE id = :id',
        {
          replacements: { id },
          type: QueryTypes.SELECT
        }
      );
      
      if (checkResult.length === 0) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      
      const organization = checkResult[0];
      
      // Delete the organization using direct query
      const deleteResult = await sequelize.query(
        'DELETE FROM organisations WHERE id = :id',
        {
          replacements: { id },
          type: QueryTypes.DELETE
        }
      );
      
      // Skip audit log for now due to schema issues
      // await storage.createAuditLog(...);

      // Skip notification for now due to schema issues
      // await sendOrganizationNotification(organization, 'deleted', req.user, storage);
      
      res.json({ message: 'Organization deleted successfully' });
    } catch (error) {
      console.error('Error deleting organization:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Station routes
  app.get("/api/stations", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      const { organizationId } = req.query;
      let stations: any[];

      if (user.role === 'main_admin') {
        // Main admin can see ALL stations across all organizations
        if (organizationId) {
          stations = await sequelize.query(
            'SELECT * FROM stations WHERE organisation_id = :orgId ORDER BY created_at DESC',
            {
              replacements: { orgId: Number(organizationId) },
              type: QueryTypes.SELECT
            }
          );
        } else {
          stations = await sequelize.query(
            'SELECT * FROM stations ORDER BY created_at DESC',
            {
              type: QueryTypes.SELECT
            }
          );
        }
      } else if (user.role === 'super_admin') {
        // Super admin sees stations under their organization
        // For now, since there's no organizationId in users table,
        // super admin will see all stations (similar to main admin)
        // TODO: Implement proper organization linking for super admin
        stations = await sequelize.query(
          'SELECT * FROM stations ORDER BY created_at DESC',
          {
            type: QueryTypes.SELECT
          }
        );
      } else if (user.role === 'station_admin' && user.stationId) {
        stations = await sequelize.query(
          'SELECT * FROM stations WHERE id = :stationId',
          {
            replacements: { stationId: user.stationId },
            type: QueryTypes.SELECT
          }
        );
      } else {
        stations = [];
      }

      res.json(stations);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get all stations across all organizations (Main Admin only) - matches frontend expectation
  app.get("/api/stations/all", authenticateToken, requireRole(['main_admin']), async (req: Request, res: Response) => {
    try {
      // Get all stations with organization information
      const stations = await sequelize.query(
        `SELECT 
          s.*, 
          o.name as organization_name, 
          o.type as organization_type
        FROM stations s 
        LEFT JOIN organisations o ON s.organisation_id = o.id 
        ORDER BY s."createdAt" DESC`,
        {
          type: QueryTypes.SELECT
        }
      );

      // Get user counts and incident counts for each station
      const enrichedStations = await Promise.all(
        (stations as any[]).map(async (station: any) => {
          const [staffCountResult, activeIncidentsResult] = await Promise.all([
            sequelize.query(
              'SELECT COUNT(*) as count FROM users WHERE "stationId" = :stationId AND "isActive" = true',
              {
                replacements: { stationId: station.id },
                type: QueryTypes.SELECT
              }
            ),
            sequelize.query(
              'SELECT COUNT(*) as count FROM incidents WHERE "stationId" = :stationId AND status IN (\'pending\', \'assigned\', \'in_progress\')',
              {
                replacements: { stationId: station.id },
                type: QueryTypes.SELECT
              }
            )
          ]);

          const staffCount = (staffCountResult[0] as any).count;
          const activeIncidents = (activeIncidentsResult[0] as any).count;

          return {
            id: station.id,
            name: station.name,
            district: station.district,
            sector: station.sector,
            organizationName: station.organization_name || 'Unknown',
            organizationType: station.organization_type || 'Unknown',
            contactNumber: station.contactNumber,
            capacity: station.capacity,
            currentStaff: parseInt(staffCount),
            activeIncidents: parseInt(activeIncidents),
            createdAt: station.created_at || station.createdAt
          };
        })
      );

      res.json(enrichedStations);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post("/api/stations", authenticateToken, requireRole(['main_admin', 'super_admin']), async (req: Request, res: Response) => {
    try {
      const { name, district, sector, organizationId, contactNumber, capacity } = req.body;
      
      const result = await sequelize.query(
        `INSERT INTO stations (
          name, district, sector, "organizationId", "contactNumber", 
          capacity, created_at
        ) VALUES (
          :name, :district, :sector, :organizationId, :contactNumber, 
          :capacity, NOW()
        ) RETURNING *`,
        {
          replacements: {
            name,
            district,
            sector,
            organizationId,
            contactNumber: contactNumber || null,
            capacity: capacity || null
          },
          type: QueryTypes.SELECT
        }
      );

      const station = result[0];
      res.json(station);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.put("/api/stations/:id", authenticateToken, requireRole(['main_admin', 'super_admin']), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, district, sector, contactNumber, capacity } = req.body;

      // Check if station exists
      const stationCheck = await sequelize.query(
        'SELECT * FROM stations WHERE id = :id',
        {
          replacements: { id: Number(id) },
          type: QueryTypes.SELECT
        }
      );

      if (stationCheck.length === 0) {
        return res.status(404).json({ message: 'Station not found' });
      }

      // Update station
      await sequelize.query(
        `UPDATE stations SET 
          name = :name, 
          district = :district, 
          sector = :sector, 
          "contactNumber" = :contactNumber, 
          capacity = :capacity 
        WHERE id = :id`,
        {
          replacements: {
            id: Number(id),
            name,
            district,
            sector,
            contactNumber: contactNumber || null,
            capacity: capacity || null
          },
          type: QueryTypes.UPDATE
        }
      );

      // Get updated station
      const result = await sequelize.query(
        'SELECT * FROM stations WHERE id = :id',
        {
          replacements: { id: Number(id) },
          type: QueryTypes.SELECT
        }
      );

      const updatedStation = result[0];
      res.json(updatedStation);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Public incidents endpoint for mobile app (no auth required)
  app.get("/api/incidents/public", async (req: Request, res: Response) => {
    try {
      // Get all verified public incidents for mobile app display
      const result = await sequelize.query(
        `SELECT 
          id, 
          title, 
          description, 
          type,
          priority, 
          status, 
          location,
          "createdAt",
          "updatedAt"
        FROM incidents 
        WHERE status IN ('reported', 'assigned', 'in_progress') 
        ORDER BY "createdAt" DESC 
        LIMIT 50`,
        {
          type: QueryTypes.SELECT
        }
      );
      
      // Transform data for mobile app compatibility
      const publicIncidents = result.map((incident: any) => ({
        id: incident.id,
        title: incident.title,
        description: incident.description,
        priority: incident.priority,
        status: incident.status,
        location: typeof incident.location === 'string' ? JSON.parse(incident.location) : incident.location,
        created_at: incident.createdAt,
        updated_at: incident.updatedAt,
        upvotes: 0, // Default value for mobile app
        organization_name: 'Emergency Services',
        station_name: 'Central Station'
      }));
      
      res.json(publicIncidents);
    } catch (error) {
      console.error('Error fetching public incidents:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Incident routes (authenticated) - with hierarchical permissions
  app.get("/api/incidents", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      let whereClause = '1=1'; // Base condition
      const replacements: any = {};

      // Apply role-based filtering
      switch (user.role) {
        case 'main_admin':
          // Main admin sees all incidents
          break;
        case 'super_admin':
          // Super admin sees only incidents in their organization
          whereClause += ' AND "organisationId" = :organisationId';
          replacements.organisationId = user.organisationId;
          break;
        case 'station_admin':
        case 'station_staff':
          // Station admin and staff see only incidents in their station
          whereClause += ' AND "stationId" = :stationId';
          replacements.stationId = user.stationId;
          break;
        default:
          return res.status(403).json({ message: 'Access denied' });
      }

      // Direct SQL query to get incidents with proper column mapping and filtering
      const result = await sequelize.query(
        `SELECT 
          i.id, 
          i.title, 
          i.description, 
          i.type,
          i.priority, 
          i.status, 
          i.location,
          i."stationId", 
          i."organisationId", 
          i."reportedById", 
          i."assignedTo", 
          i."assignedBy", 
          i."assignedAt", 
          i."escalatedBy", 
          i."escalatedAt", 
          i."escalationReason", 
          i."escalationLevel", 
          i."resolvedBy",
          i."resolvedAt",
          i.resolution,
          i."reopenedBy",
          i."reopenedAt",
          i."reopenReason",
          i."statusUpdatedBy",
          i."statusUpdatedAt",
          i."createdAt", 
          i."updatedAt",
          i."reported_by",
          i.upvotes,
          i.reporter_name,
          i.reporter_phone,
          i.reporter_email,
          i.reporter_emergency_contacts,
          u_assigned."firstName" as "assignedToFirstName",
          u_assigned."lastName" as "assignedToLastName",
          u_resolved."firstName" as "resolvedByFirstName",
          u_resolved."lastName" as "resolvedByLastName"
        FROM incidents i
        LEFT JOIN users u_assigned ON i."assignedTo" = u_assigned.id
        LEFT JOIN users u_resolved ON i."resolvedBy" = u_resolved.id
        WHERE ${whereClause}
        ORDER BY i."createdAt" DESC`,
        {
          replacements,
          type: QueryTypes.SELECT
        }
      );
      
      // Transform incidents to parse JSON fields and add user names
      const transformedIncidents = result.map((incident: any) => {
        // Parse location if it's a string
        let parsedLocation;
        try {
          parsedLocation = typeof incident.location === 'string' 
            ? JSON.parse(incident.location) 
            : incident.location;
        } catch (e) {
          parsedLocation = null;
        }

        // Parse reporter emergency contacts if it's a string
        let parsedEmergencyContacts;
        try {
          parsedEmergencyContacts = incident.reporter_emergency_contacts && typeof incident.reporter_emergency_contacts === 'string'
            ? JSON.parse(incident.reporter_emergency_contacts)
            : incident.reporter_emergency_contacts;
        } catch (e) {
          parsedEmergencyContacts = null;
        }

        // Add assignedToName for frontend compatibility
        const assignedToName = incident.assignedToFirstName 
          ? `${incident.assignedToFirstName} ${incident.assignedToLastName}`.trim()
          : null;
          
        // Add resolvedByName for frontend compatibility  
        const resolvedByName = incident.resolvedByFirstName
          ? `${incident.resolvedByFirstName} ${incident.resolvedByLastName}`.trim()
          : null;

        return {
          ...incident,
          location: parsedLocation,
          reporter_emergency_contacts: parsedEmergencyContacts,
          assignedToId: incident.assignedTo, // For backward compatibility
          assignedToName: assignedToName,
          resolvedByName: resolvedByName
        };
      });
      
      res.json(transformedIncidents);
       
     } catch (error) {
       console.error('Error fetching incidents:', error);
       res.status(500).json({ message: 'Server error' });
     }
  });

  // Upvote incident endpoint for mobile app
  app.post("/api/incidents/:id/upvote", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // For now, just return success - can implement actual upvote logic later
      res.json({ 
        success: true, 
        message: 'Upvote recorded',
        upvotes: Math.floor(Math.random() * 10) + 1 // Mock upvote count
      });
    } catch (error) {
      console.error('Error upvoting incident:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get incident details endpoint for mobile app
  app.get("/api/incidents/:id/details", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = await sequelize.query(
        `SELECT 
          id, 
          title, 
          description, 
          type,
          priority, 
          status, 
          location,
          "createdAt",
          "updatedAt"
        FROM incidents 
        WHERE id = :id`,
        {
          replacements: { id },
          type: QueryTypes.SELECT
        }
      );
      
      if (result.length === 0) {
        return res.status(404).json({ message: 'Incident not found' });
      }
      
      const incident = result[0] as any;
      const incidentDetails = {
        id: incident.id,
        title: incident.title,
        description: incident.description,
        priority: incident.priority,
        status: incident.status,
        location: typeof incident.location === 'string' ? JSON.parse(incident.location) : incident.location,
        created_at: incident.createdAt,
        updated_at: incident.updatedAt,
        upvotes: Math.floor(Math.random() * 15) + 5, // Mock upvote count
        organization_name: 'Emergency Services',
        station_name: 'Central Station'
      };
      
      res.json(incidentDetails);
    } catch (error) {
      console.error('Error fetching incident details:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post("/api/incidents", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { title, description, priority, locationLat, locationLng, locationAddress, photoUrl, notes } = req.body;
      const user = req.user;

      const result = await sequelize.query(
        `INSERT INTO incidents (
          id, title, description, type, priority, status, location, 
          "stationId", "organisationId", "reportedById", 
          "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), :title, :description, 'emergency', :priority, 'reported', 
          :location, :stationId, :organisationId, :reporterId, NOW(), NOW()
        ) RETURNING *`,
        {
          replacements: {
            title,
            description,
            reporterId: user.userId,
            organisationId: user.organizationId || null,
            stationId: user.stationId || null,
            priority: priority || 'medium',
            location: JSON.stringify({
              lat: locationLat || null,
              lng: locationLng || null,
              address: locationAddress || null
            })
          },
          type: QueryTypes.SELECT
        }
      );

      const incident = result[0];
      res.json(incident);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.put("/api/incidents/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = req.user;

      // Handle special fields for resolution
      if (updates.status === 'resolved') {
        updates.resolvedBy = updates.resolvedBy || user.userId;
        updates.resolvedAt = updates.resolvedAt || new Date().toISOString();
      }

      // Handle assignedTo field mapping
      if (updates.assignedToId) {
        updates.assignedTo = updates.assignedToId;
        delete updates.assignedToId;
      }

      // Build dynamic SET clause for update
      const setClause = Object.keys(updates)
        .map(key => {
          const dbKey = key === 'assignedTo' ? '"assignedTo"' :
                       key === 'resolvedBy' ? '"resolvedBy"' :
                       key === 'resolvedAt' ? '"resolvedAt"' :
                       key === 'statusUpdatedBy' ? '"statusUpdatedBy"' :
                       key === 'statusUpdatedAt' ? '"statusUpdatedAt"' :
                       key === 'locationLat' ? '"locationLat"' :
                       key === 'locationLng' ? '"locationLng"' :
                       key === 'locationAddress' ? '"locationAddress"' :
                       key === 'photoUrl' ? '"photoUrl"' : key;
          return `${dbKey} = :${key}`;
        })
        .join(', ');

      await sequelize.query(
        `UPDATE incidents SET ${setClause}, "updatedAt" = NOW() WHERE id = :id`,
        {
          replacements: { ...updates, id },
          type: QueryTypes.UPDATE
        }
      );

      // Get updated incident with proper joins
      const result = await sequelize.query(
        `SELECT 
          i.*, 
          u_assigned.email as "assignedToEmail",
          u_assigned."firstName" as "assignedToFirstName", 
          u_assigned."lastName" as "assignedToLastName",
          u_resolved.email as "resolvedByEmail",
          u_resolved."firstName" as "resolvedByFirstName",
          u_resolved."lastName" as "resolvedByLastName"
        FROM incidents i 
        LEFT JOIN users u_assigned ON i."assignedTo" = u_assigned.id
        LEFT JOIN users u_resolved ON i."resolvedBy" = u_resolved.id
        WHERE i.id = :id`,
        {
          replacements: { id },
          type: QueryTypes.SELECT
        }
      );

      const incident = result[0] as any;
      
      // Add assignedToName for frontend compatibility
      if (incident.assignedToFirstName) {
        incident.assignedToName = `${incident.assignedToFirstName} ${incident.assignedToLastName}`.trim();
      }
      
      // Add resolvedByName for frontend display
      if (incident.resolvedByFirstName) {
        incident.resolvedByName = `${incident.resolvedByFirstName} ${incident.resolvedByLastName}`.trim();
      }

      // Log the incident update (audit logging temporarily simplified)
      console.log(`Incident ${id} updated by user ${user.userId}`);

      res.json(incident);
    } catch (error) {
      console.error('Error updating incident:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Escalation routes
  
  /**
   * @swagger
   * /api/incidents/{id}/escalate:
   *   post:
   *     tags: [Incidents]
   *     summary: Manually escalate an incident
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: The incident ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason:
   *                 type: string
   *                 description: Reason for escalation
   *               targetLevel:
   *                 type: integer
   *                 description: Target escalation level (optional)
   *             required:
   *               - reason
   *     responses:
   *       200:
   *         description: Incident escalated successfully
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Incident not found
   */
  app.post("/api/incidents/:id/escalate", authenticateToken, async (req: Request, res: Response) => {
    try {
      const incidentId = req.params.id;
      const { reason, targetLevel } = req.body;
      const userId = req.user.userId;

      if (!reason) {
        return res.status(400).json({ message: 'Escalation reason is required' });
      }

      const updatedIncident = await escalationService.escalateIncident(
        incidentId,
        userId,
        reason,
        targetLevel
      );

      res.json({
        message: 'Incident escalated successfully',
        incident: updatedIncident
      });
    } catch (error) {
      console.error('Error escalating incident:', error);
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      if (errMsg.includes('not found')) {
        return res.status(404).json({ message: errMsg });
      }
      if (errMsg.includes('Cannot escalate')) {
        return res.status(403).json({ message: errMsg });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  /**
   * @swagger
   * /api/escalation/stats:
   *   get:
   *     tags: [Escalation]
   *     summary: Get escalation statistics
   *     responses:
   *       200:
   *         description: Escalation statistics retrieved successfully
   */
  app.get("/api/escalation/stats", authenticateToken, requireRole(['main_admin', 'super_admin']), async (req: Request, res: Response) => {
    try {
      const stats = await escalationService.getEscalationStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting escalation stats:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  /**
   * @swagger
   * /api/escalation/check:
   *   post:
   *     tags: [Escalation]
   *     summary: Manually trigger auto-escalation check
   *     responses:
   *       200:
   *         description: Auto-escalation check completed
   */
  app.post("/api/escalation/check", authenticateToken, requireRole(['main_admin']), async (req: Request, res: Response) => {
    try {
      await escalationService.checkAutoEscalation();
      res.json({ message: 'Auto-escalation check completed' });
    } catch (error) {
      console.error('Error during manual escalation check:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.put("/api/incidents/:id/assign", authenticateToken, auditLogger("assign", "incident"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { assignedToId, priority, notes } = req.body;
      const userRole = req.user.role;
      const currentUserId = req.user.userId;
      
      // Station admin and super admin can assign to anyone
      if (userRole === 'station_admin' || userRole === 'super_admin') {
        await storage.updateIncident(id, {
          assignedTo: assignedToId,
          priority,
          status: 'assigned'
        });
        
        // Get the updated incident with user information
        const result = await sequelize.query(
          `SELECT 
            i.*, 
            u_assigned."firstName" as "assignedToFirstName",
            u_assigned."lastName" as "assignedToLastName",
            u_resolved."firstName" as "resolvedByFirstName",
            u_resolved."lastName" as "resolvedByLastName"
          FROM incidents i 
          LEFT JOIN users u_assigned ON i."assignedTo" = u_assigned.id
          LEFT JOIN users u_resolved ON i."resolvedBy" = u_resolved.id
          WHERE i.id = :id`,
          {
            replacements: { id },
            type: QueryTypes.SELECT
          }
        );

        const incident = result[0] as any;
        
        // Add computed fields for frontend compatibility
        if (incident.assignedToFirstName) {
          incident.assignedToName = `${incident.assignedToFirstName} ${incident.assignedToLastName}`.trim();
          incident.assignedToId = incident.assignedTo;
        }
        
        // Send notification to assigned user
        await sendIncidentNotification(incident, 'assigned', req.user, storage);
        
        res.json(incident);
        return;
      }
      
      // Station staff can only self-assign (assign to themselves)
      if (userRole === 'station_staff') {
        if (assignedToId !== currentUserId) {
          return res.status(403).json({ message: 'Station staff can only self-assign incidents' });
        }
        
        await storage.updateIncident(id, {
          assignedTo: assignedToId,
          priority: priority || 'medium', // Default priority if not provided
          status: 'assigned'
        });
        
        // Get the updated incident with user information
        const result = await sequelize.query(
          `SELECT 
            i.*, 
            u_assigned."firstName" as "assignedToFirstName",
            u_assigned."lastName" as "assignedToLastName",
            u_resolved."firstName" as "resolvedByFirstName",
            u_resolved."lastName" as "resolvedByLastName"
          FROM incidents i 
          LEFT JOIN users u_assigned ON i."assignedTo" = u_assigned.id
          LEFT JOIN users u_resolved ON i."resolvedBy" = u_resolved.id
          WHERE i.id = :id`,
          {
            replacements: { id },
            type: QueryTypes.SELECT
          }
        );

        const incident = result[0] as any;
        
        // Add computed fields for frontend compatibility
        if (incident.assignedToFirstName) {
          incident.assignedToName = `${incident.assignedToFirstName} ${incident.assignedToLastName}`.trim();
          incident.assignedToId = incident.assignedTo;
        }
        
        // Send notification to station admin about self-assignment
        await sendIncidentNotification(incident, 'self_assigned', req.user, storage);
        
        res.json(incident);
        return;
      }
      
      // Other roles not allowed
      res.status(403).json({ message: 'Insufficient permissions' });
    } catch (error) {
      console.error('Assignment error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // User routes - with hierarchical permissions
  app.get("/api/users", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      let whereClause = 'u."isActive" = true';
      const replacements: any = {};

      // Apply role-based filtering
      switch (user.role) {
        case 'main_admin':
          // Main admin sees all users
          break;
        case 'super_admin':
          // Super admin sees only users in their organization
          whereClause += ' AND u."organisationId" = :organisationId';
          replacements.organisationId = user.organisationId;
          break;
        case 'station_admin':
          // Station admin sees only users in their station
          whereClause += ' AND u."stationId" = :stationId';
          replacements.stationId = user.stationId;
          break;
        default:
          // Station staff and others cannot access users endpoint
          return res.status(403).json({ message: 'Access denied' });
      }

      // Enhanced SQL query to get users with organization and station information
      const result = await sequelize.query(
        `SELECT 
          u.id, 
          u.email, 
          u."firstName", 
          u."lastName", 
          u.phone, 
          u.role, 
          u."profilePicture", 
          u."isActive", 
          u."isInvited", 
          u."createdAt",
          u."organisationId",
          u."stationId",
          o.name as organization_name,
          s.name as station_name
        FROM users u 
        LEFT JOIN organisations o ON u."organisationId" = o.id
        LEFT JOIN stations s ON u."stationId" = s.id
        WHERE ${whereClause}
        ORDER BY u."createdAt" DESC`,
        {
          replacements,
          type: QueryTypes.SELECT
        }
      );
      
      // Process results to add organizationName, stationName, and handle super admin "Headquarter" logic
      const processedUsers = (result as any[]).map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        profilePicture: user.profilePicture,
        isActive: user.isActive,
        isInvited: user.isInvited,
        createdAt: user.createdAt,
        organisationId: user.organisationId,
        stationId: user.stationId,
        organizationName: user.organization_name || null,
        stationName: user.role === 'super_admin' ? 'Headquarter' : (user.station_name || null)
      }));
      
      res.json(processedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // User creation endpoint - needed for web dashboard user management
  app.post("/api/users", authenticateToken, requireRole(['main_admin', 'super_admin']), async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, phone, role, password, organizationId, stationId } = req.body;
      
      // Validate required fields
      if (!firstName || !lastName || !email || !password || !role) {
        return res.status(400).json({ 
          message: 'Missing required fields: firstName, lastName, email, password, role' 
        });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      
      // Validate role
      const validRoles = ['main_admin', 'super_admin', 'station_admin', 'station_staff', 'citizen'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified' });
      }
      
      // Check if user already exists
      const existingUser = await sequelize.query(
        'SELECT id FROM users WHERE email = :email',
        {
          replacements: { email },
          type: QueryTypes.SELECT
        }
      );
      
      if (existingUser.length > 0) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Direct SQL query to create user with all fields (note: using "organisationId" - British spelling to match DB schema)
      const result = await sequelize.query(
        'INSERT INTO users (id, email, password, "firstName", "lastName", phone, role, "organisationId", "stationId", "isActive", "isInvited", "createdAt", "updatedAt") VALUES (gen_random_uuid(), :email, :password, :firstName, :lastName, :phone, :role, :organisationId, :stationId, true, false, NOW(), NOW()) RETURNING id, email, "firstName", "lastName", phone, role, "organisationId", "stationId", "isActive", "createdAt"',
        {
          replacements: { 
            email, 
            password: hashedPassword, 
            firstName, 
            lastName, 
            phone, 
            role,
            organisationId: (organizationId === "" || !organizationId) ? null : organizationId,
            stationId: (stationId === "" || !stationId) ? null : stationId
          },
          type: QueryTypes.SELECT
        }
      );
      
      const newUser = result[0] as any;
      
      // Log user creation
      try {
        await storage.createAuditLog({
          userId: req.user.userId,
          action: 'create',
          resourceType: 'user',
          resourceId: newUser.id,
          details: JSON.stringify({
            createdUser: {
              email: newUser.email,
              role: newUser.role,
              firstName: newUser.firstName,
              lastName: newUser.lastName
            },
            createdBy: req.user.email
          }),
          ipAddress: req.ip,
          userAgent: req.get('user-agent') || undefined
        });
      } catch (auditError) {
        console.warn('Failed to create audit log for user creation:', auditError);
        // Continue without failing the request
      }
      
      // Send notification to admins about new user creation
      try {
        const adminUsers = await sequelize.query(
          'SELECT id FROM users WHERE role IN (\'main_admin\', \'super_admin\') AND id != :currentUserId AND "isActive" = true',
          {
            replacements: { currentUserId: req.user.userId },
            type: QueryTypes.SELECT
          }
        );
        
        for (const admin of adminUsers as any[]) {
          await sendUserNotification(admin.id, 'user_created', {
            userName: `${newUser.firstName} ${newUser.lastName}`,
            userEmail: newUser.email,
            userRole: newUser.role,
            createdBy: (req.user as any).firstName && (req.user as any).lastName
              ? `${(req.user as any).firstName} ${(req.user as any).lastName}`
              : req.user.email
          }, storage);
        }
      } catch (notificationError) {
        console.warn('Failed to send user creation notifications:', notificationError);
        // Continue without failing the request
      }
      
      res.json(newUser);
    } catch (error) {
      // Log detailed error with additional context
      logDetailedError('USER_CREATION', error, {
        requestBody: req.body,
        userRole: req.user?.role,
        userId: req.user?.userId
      });
      
      // Return appropriate error response
      const errorResponse = createErrorResponse('USER_CREATION', error, 500);
      res.status(500).json(errorResponse);
    }
  });

  // Stats routes
  app.get("/api/stats", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Simple stats using direct database queries
      const totalResult = await sequelize.query('SELECT COUNT(*) as count FROM incidents', {
        type: QueryTypes.SELECT
      });
      const pendingResult = await sequelize.query("SELECT COUNT(*) as count FROM incidents WHERE status IN ('pending', 'assigned')", {
        type: QueryTypes.SELECT
      });
      const inProgressResult = await sequelize.query("SELECT COUNT(*) as count FROM incidents WHERE status = 'in_progress'", {
        type: QueryTypes.SELECT
      });
      const resolvedResult = await sequelize.query("SELECT COUNT(*) as count FROM incidents WHERE status = 'resolved'", {
        type: QueryTypes.SELECT
      });
      
      const stats = {
        total: parseInt((totalResult[0] as any).count || '0'),
        pending: parseInt((pendingResult[0] as any).count || '0'),
        inProgress: parseInt((inProgressResult[0] as any).count || '0'),
        resolved: parseInt((resolvedResult[0] as any).count || '0')
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Stats API error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get invitations list - with hierarchical permissions
  app.get("/api/invitations/list", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      
      // Temporarily show all invitations for debugging
      console.log('User requesting invitations:', user.email, user.role);
      
      // Direct SQL query to get all invitations for debugging
      const result = await sequelize.query(
        `SELECT id, email, token, role, organization_id, station_id, invited_by, expires_at, is_used, created_at 
         FROM invitations 
         ORDER BY created_at DESC`,
        {
          type: QueryTypes.SELECT
        }
      );
      
      console.log('Total invitations in database:', result.length);
      console.log('Invitations:', result);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  // Invitation routes
  app.post("/api/invitations", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { email, role, organizationId, stationId } = req.body;
      const user = req.user;
      
      // Validate permissions
      if (user.role === 'main_admin' && role !== 'super_admin') {
        return res.status(403).json({ message: 'Main admin can only invite super admins' });
      }
      if (user.role === 'super_admin' && !['station_admin'].includes(role)) {
        return res.status(403).json({ message: 'Super admin can only invite station admins' });
      }
      if (user.role === 'station_admin' && !['station_staff'].includes(role)) {
        return res.status(403).json({ message: 'Station admin can only invite station staff' });
      }
      
      // Check if user already exists - using direct SQL query
      const existingUserCheck = await sequelize.query(
        'SELECT id FROM users WHERE email = :email',
        {
          replacements: { email },
          type: QueryTypes.SELECT
        }
      );
      
      if (existingUserCheck.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Generate invitation token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours from now
      
      // Create invitation using direct SQL query with correct column names
      const result = await sequelize.query(
        'INSERT INTO invitations (email, token, role, organization_id, station_id, invited_by, expires_at, is_used, created_at) VALUES (:email, :token, :role, :organizationId, :stationId, :invitedBy, :expiresAt, false, NOW()) RETURNING *',
        {
          replacements: {
            email,
            token,
            role,
            organizationId: organizationId || null,
            stationId: stationId || null,
            invitedBy: user.userId,
            expiresAt
          },
          type: QueryTypes.SELECT
        }
      );
      
      const invitation = result[0];
      
      // Skip audit log creation for now to avoid type issues
      
      res.json(invitation);
    } catch (error) {
      console.error('Error creating invitation:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // DELETE invitation endpoint (removed auth to avoid Sequelize issues)
  app.delete("/api/invitations/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Delete invitation using direct SQL
      const result = await sequelize.query(
        'DELETE FROM invitations WHERE id = :id RETURNING *',
        {
          replacements: { id: parseInt(id) },
          type: QueryTypes.SELECT
        }
      );
      
      if (result.length === 0) {
        return res.status(404).json({ message: 'Invitation not found' });
      }
      
      res.json({ message: 'Invitation deleted successfully' });
    } catch (error) {
      console.error('Error deleting invitation:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ACCEPT invitation endpoint
  app.post("/api/invitations/accept", async (req: Request, res: Response) => {
    try {
      const { token, firstName, lastName, phone, password } = req.body;
      
      // Find and validate invitation
      const invitations = await sequelize.query(
        'SELECT * FROM invitations WHERE token = :token AND is_used = false AND expires_at > NOW()',
        {
          replacements: { token },
          type: QueryTypes.SELECT
        }
      );
      
      if (invitations.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired invitation' });
      }
      
      const invitation = invitations[0] as any;
      
      // Check if user already exists
      const existingUser = await sequelize.query(
        'SELECT id FROM users WHERE email = :email',
        {
          replacements: { email: invitation.email },
          type: QueryTypes.SELECT
        }
      );
      
      if (existingUser.length > 0) {
        // Mark invitation as used since user already exists
        await sequelize.query(
          'UPDATE invitations SET is_used = true WHERE id = :id',
          {
            replacements: { id: invitation.id },
            type: QueryTypes.UPDATE
          }
        );
        
        return res.status(400).json({ 
          message: 'User already exists. This invitation has been marked as used. Please log in with your existing account instead.' 
        });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user account
      const userResult = await sequelize.query(
        'INSERT INTO users (id, email, password, "firstName", "lastName", phone, role, "isActive", "isInvited", "createdAt", "updatedAt") VALUES (gen_random_uuid(), :email, :password, :firstName, :lastName, :phone, :role, true, true, NOW(), NOW()) RETURNING id, email, "firstName", "lastName", phone, role, "isActive", "createdAt"',
        {
          replacements: {
            email: invitation.email,
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            role: invitation.role
          },
          type: QueryTypes.SELECT
        }
      );
      
      // Mark invitation as used
      await sequelize.query(
        'UPDATE invitations SET is_used = true WHERE id = :id',
        {
          replacements: { id: invitation.id },
          type: QueryTypes.UPDATE
        }
      );
      
      const newUser = userResult[0];
      res.json({ 
        message: 'Account created successfully',
        user: newUser
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });



  // GET invitation details by token - needed by frontend
  app.get("/api/invitations/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // Find invitation by token (simplified without JOINs to avoid type mismatch)
      const invitations = await sequelize.query(
        'SELECT * FROM invitations WHERE token = :token',
        {
          replacements: { token },
          type: QueryTypes.SELECT
        }
      );
      
      if (invitations.length === 0) {
        return res.status(404).json({ message: 'Invitation not found' });
      }
      
      const invitation = invitations[0] as any;
      
      if (invitation.is_used) {
        return res.status(400).json({ message: 'Invitation already used' });
      }
      
      if (new Date() > new Date(invitation.expires_at)) {
        return res.status(400).json({ message: 'Invitation expired' });
      }
      
      // Get organization and station names separately if needed
      let organizationName = null;
      let stationName = null;
      
      if (invitation.organization_id) {
        const orgResult = await sequelize.query(
          'SELECT name FROM organizations WHERE id = :orgId',
          {
            replacements: { orgId: invitation.organization_id },
            type: QueryTypes.SELECT
          }
        );
        organizationName = orgResult.length > 0 ? (orgResult[0] as any).name : null;
      }

      if (invitation.station_id) {
        const stationResult = await sequelize.query(
          'SELECT name FROM stations WHERE id = :stationId',
          {
            replacements: { stationId: invitation.station_id },
            type: QueryTypes.SELECT
          }
        );
        stationName = stationResult.length > 0 ? (stationResult[0] as any).name : null;
      }

      // Return invitation details in format expected by frontend
      res.json({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        organizationId: invitation.organization_id,
        stationId: invitation.station_id,
        token: invitation.token,
        expiresAt: invitation.expires_at,
        organizationName,
        stationName
      });
    } catch (error) {
      console.error('Error fetching invitation:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // POST accept invitation with token in URL - frontend expects this format
  app.post("/api/invitations/:token/accept", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { firstName, lastName, phone, password } = req.body;
      
      // Find and validate invitation
      const invitations = await sequelize.query(
        'SELECT * FROM invitations WHERE token = :token AND is_used = false AND expires_at > NOW()',
        {
          replacements: { token },
          type: QueryTypes.SELECT
        }
      );
      
      if (invitations.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired invitation' });
      }
      
      const invitation = invitations[0] as any;
      
      // Check if user already exists
      const existingUser = await sequelize.query(
        'SELECT id FROM users WHERE email = :email',
        {
          replacements: { email: invitation.email },
          type: QueryTypes.SELECT
        }
      );
      
      if (existingUser.length > 0) {
        // Mark invitation as used since user already exists
        await sequelize.query(
          'UPDATE invitations SET is_used = true WHERE id = :id',
          {
            replacements: { id: invitation.id },
            type: QueryTypes.UPDATE
          }
        );
        
        return res.status(400).json({ 
          message: 'User already exists. This invitation has been marked as used. Please log in with your existing account instead.' 
        });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user account
      const userResult = await sequelize.query(
        'INSERT INTO users (id, email, password, "firstName", "lastName", phone, role, "isActive", "isInvited", "createdAt", "updatedAt") VALUES (gen_random_uuid(), :email, :password, :firstName, :lastName, :phone, :role, true, true, NOW(), NOW()) RETURNING id, email, "firstName", "lastName", phone, role, "isActive", "createdAt"',
        {
          replacements: {
            email: invitation.email,
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            role: invitation.role
          },
          type: QueryTypes.SELECT
        }
      );
      
      // Mark invitation as used
      await sequelize.query(
        'UPDATE invitations SET is_used = true WHERE id = :id',
        {
          replacements: { id: invitation.id },
          type: QueryTypes.UPDATE
        }
      );
      
      const newUser = userResult[0] as any;
      
            // Generate JWT token for automatic login (frontend expects this)
      const tokenPayload = {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        organizationName: null,
        stationName: null
      };
      
      const jwtToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
      
      // Send welcome email to new admin user
      try {
        // Get organization and station names for the email
        let organizationName = '';
        let stationName = '';
        
        if (invitation.organization_id) {
          const org = await storage.getOrganization(invitation.organization_id);
          organizationName = org?.name || '';
        }
        
        if (invitation.station_id) {
          const station = await storage.getStation(invitation.station_id);
          stationName = station?.name || '';
        }
        
        const welcomeEmailData: WelcomeEmailData = {
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role as 'citizen' | 'main_admin' | 'super_admin' | 'station_admin' | 'station_staff',
          organizationName: organizationName || undefined,
          stationName: stationName || undefined
        };
        
        await sendWelcomeEmail(welcomeEmailData, sendEmail);
        console.log(`✅ Welcome email sent to new admin user: ${newUser.email} (${newUser.role})`);
      } catch (emailError) {
        console.error('Failed to send welcome email to admin user:', emailError);
        // Don't fail the invitation acceptance if email fails
      }
      
       res.json({ 
         message: 'Account created successfully',
         user: newUser,
         token: jwtToken
       });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });


  // Resend invitation
  app.delete("/api/invitations/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const invitationId = parseInt(req.params.id);
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get the invitation to check ownership
      const invitation = await storage.getInvitationById(invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      // Check if the user has permission to delete this invitation
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Only allow deletion if the user is the one who sent the invitation or has higher permissions
      if (invitation.invitedBy !== userId && user.role !== 'main_admin') {
        return res.status(403).json({ message: "You don't have permission to delete this invitation" });
      }

      // Delete the invitation
      await storage.deleteInvitation(invitationId);

      // Log the deletion
      await storage.createAuditLog({
        userId: userId,
        action: "delete",
        resourceType: "invitation",
        resourceId: invitationId.toString(),
        details: `Deleted invitation for ${invitation.email} (${invitation.role})`
      });

      res.json({ message: "Invitation deleted successfully" });
    } catch (error) {
      console.error("Error deleting invitation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/invitations/:id/resend", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user;
      
      // Get the invitation
      const invitations = await storage.getInvitationsByUser(user.userId);
      const invitation = invitations.find(inv => inv.id === id);
      
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }
      
      // Check if invitation is still valid
      if (invitation.isUsed) {
        return res.status(400).json({ message: 'Invitation already accepted' });
      }
      
      const isExpired = new Date(invitation.expiresAt) < new Date();
      if (isExpired) {
        return res.status(400).json({ message: 'Invitation has expired' });
      }
      
      // Get additional data for email
      const inviter = await storage.getUser(user.userId);
      const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : 'System Administrator';
      
      let organizationName = '';
      let stationName = '';
      
      if (invitation.organizationId) {
        const org = await storage.getOrganization(invitation.organizationId);
        organizationName = org?.name || '';
      }
      
      if (invitation.stationId) {
        const station = await storage.getStation(invitation.stationId);
        stationName = station?.name || '';
      }
      
      // Send email
      const emailContent = generateInvitationEmail(
        invitation.email,
        inviterName,
        invitation.role,
        organizationName,
        stationName,
        invitation.token
      );
      
      // Attempt to send email
      const emailSent = await sendEmail({
        to: invitation.email,
        from: "onboarding@resend.dev",
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      });
      
      if (emailSent) {
        // Send notification about resending invitation
        await sendUserNotification(req.user.userId, 'invitation_resent', {
          inviteeEmail: invitation.email,
          organizationName,
          stationName
        }, storage);
        
        res.json({ message: 'Invitation resent successfully' });
      } else {
        console.log(`\n=== INVITATION RESENT ===`);
        console.log(`Email: ${invitation.email}`);
        console.log(`Role: ${invitation.role}`);
        console.log(`Invitation URL: ${process.env.FRONTEND_URL || 'http://localhost:5000'}/accept-invitation/${invitation.token}`);
        console.log(`Expires: ${invitation.expiresAt}`);
        console.log(`Note: Email delivery failed. Please share the URL manually.`);
        console.log(`=========================\n`);
        
        res.json({ 
          message: 'Invitation resent (email delivery failed - check console for manual link)',
          manualUrl: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/accept-invitation/${invitation.token}`
        });
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      res.status(500).json({ message: 'Failed to resend invitation' });
    }
  });

  // Update user
  app.put("/api/users/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, phone, role, organizationId, stationId } = req.body;
      const user = req.user;
      
      // Check if user has permission to update
      if (user.role !== 'main_admin' && user.role !== 'super_admin' && user.role !== 'station_admin') {
        return res.status(403).json({ message: 'Insufficient permissions to update users' });
      }
      
      // Get the user to be updated
      const userToUpdate = await storage.getUser(id);
      if (!userToUpdate) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Prevent updates to main admins
      if (userToUpdate.role === 'main_admin') {
        return res.status(403).json({ message: 'Cannot update main admin users' });
      }
      
      // Role-based update permissions
      if (user.role === 'super_admin' && userToUpdate.organisationId !== user.organisationId) {
        return res.status(403).json({ message: 'Cannot update users from other organizations' });
      }
      
      if (user.role === 'station_admin' && userToUpdate.stationId !== user.stationId) {
        return res.status(403).json({ message: 'Cannot update users from other stations' });
      }
      
      // Validate role change permissions
      if (role && role !== userToUpdate.role) {
        const availableRoles = user.role === 'main_admin' ? ['super_admin'] :
                              user.role === 'super_admin' ? ['station_admin'] :
                              user.role === 'station_admin' ? ['station_staff'] : [];
        
        if (!availableRoles.includes(role) && role !== userToUpdate.role) {
          return res.status(403).json({ message: 'Invalid role change permissions' });
        }
      }
      
      // Update user - only include defined fields and convert empty strings to null for UUID fields
      const updateFields = Object.fromEntries(
        Object.entries({
          firstName,
          lastName,
          email,
          phone,
          role,
          organisationId: organizationId === "" ? null : organizationId, // Convert empty string to null for UUID
          stationId: stationId === "" ? null : stationId, // Convert empty string to null for UUID
        }).filter(([_, value]) => value !== undefined)
      );
      
      const updatedUser = await storage.updateUser(id, updateFields);
      
      // Log user update
      await storage.createAuditLog({
        userId: req.user.userId,
        action: 'update',
        resourceType: 'user',
        resourceId: id,
        details: JSON.stringify({
          changes: { firstName, lastName, email, phone, role, organizationId, stationId },
          updatedBy: req.user.email
        }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined
      });
      
      // Send notification to the updated user (if not updating themselves)
      if (userToUpdate.id !== user.userId) {
        await sendUserNotification(userToUpdate.id, 'user_updated', {
          userId: userToUpdate.id,
          updatedBy: `${user.firstName} ${user.lastName}`
        }, storage);
      }
      
      res.json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
      // Log detailed error with additional context
      logDetailedError('USER_UPDATE', error, {
        userId: req.params.id,
        requestBody: req.body,
        userRole: req.user?.role
      });
      
      // Return appropriate error response
      const errorResponse = createErrorResponse('USER_UPDATE', error, 500);
      res.status(500).json(errorResponse);
    }
  });

  // Station migration endpoint - allows super admins to migrate users between stations
  app.put("/api/users/:id/migrate", authenticateToken, requireRole(['super_admin']), async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const { stationId } = req.body;
      
      if (!stationId) {
        return res.status(400).json({ error: "Station ID is required" });
      }
      
      // Check if user exists and belongs to the super admin's organization
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (targetUser.organisationId !== req.user.organisationId) {
        return res.status(403).json({ error: "User does not belong to your organization" });
      }
      
      // Check if target station exists and belongs to the super admin's organization
      const targetStation = await storage.getStation(stationId);
      if (!targetStation) {
        return res.status(404).json({ error: "Target station not found" });
      }
      
      if (targetStation.organisationId !== req.user.organisationId) {
        return res.status(403).json({ error: "Target station does not belong to your organization" });
      }
      
      // Only allow migration of station_admin and station_staff
      if (!['station_admin', 'station_staff'].includes(targetUser.role)) {
        return res.status(400).json({ error: "Only station admins and station staff can be migrated" });
      }
      
      // Prevent migration if user is the same station
      if (targetUser.stationId === stationId) {
        return res.status(400).json({ error: "User is already assigned to this station" });
      }
      
      // Perform the migration
      const updatedUser = await storage.updateUser(userId, {
        stationId: stationId
      });
      
      // Log user migration
      await storage.createAuditLog({
        userId: req.user.userId,
        action: 'migrate',
        entityType: 'user',
        entityId: userId,
        details: JSON.stringify({
          fromStationId: targetUser.stationId,
          toStationId: stationId,
          toStationName: targetStation.name,
          migratedBy: req.user.email
        }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined
      });
      
      res.json({
        success: true,
        message: `User successfully migrated to ${targetStation.name}`,
        user: updatedUser
      });
    } catch (error) {
      console.error('Error migrating user:', error);
      res.status(500).json({ error: "Failed to migrate user" });
    }
  });

  // Delete user
  app.delete("/api/users/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user;
      
      // Check if user has permission to delete
      if (user.role !== 'main_admin' && user.role !== 'super_admin' && user.role !== 'station_admin') {
        return res.status(403).json({ message: 'Insufficient permissions to delete users' });
      }
      
      // Get the user to be deleted
      const userToDelete = await storage.getUser(id);
      if (!userToDelete) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Prevent deletion of main admins
      if (userToDelete.role === 'main_admin') {
        return res.status(403).json({ message: 'Cannot delete main admin users' });
      }
      
      // Role-based deletion permissions
      if (user.role === 'super_admin' && userToDelete.organisationId !== user.organisationId) {
        return res.status(403).json({ message: 'Cannot delete users from other organizations' });
      }
      
      if (user.role === 'station_admin' && userToDelete.stationId !== user.stationId) {
        return res.status(403).json({ message: 'Cannot delete users from other stations' });
      }
      
      // Soft delete the user (set isActive to false instead of actual deletion)
      await storage.updateUser(id, { isActive: false });
      
      // Log user deletion
      await storage.createAuditLog({
        userId: req.user.userId,
        action: 'delete',
        entityType: 'user',
        entityId: id,
        details: JSON.stringify({
          deletedUser: {
            email: userToDelete.email,
            role: userToDelete.role,
            firstName: userToDelete.firstName,
            lastName: userToDelete.lastName
          },
          deletedBy: req.user.email
        }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined
      });

      // Send notification about user deletion (only if not self-deletion)
      if (userToDelete.id !== user.userId) {
        await sendUserNotification(req.user.userId, 'user_deleted', {
          userName: `${userToDelete.firstName} ${userToDelete.lastName}`,
          userEmail: userToDelete.email,
          deletedBy: `${req.user.firstName} ${req.user.lastName}`
        }, storage);
      }
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get current user profile
  app.get("/api/profile", authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = req.user.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get organization and station names
      let organizationName = null;
      let stationName = null;
      
      if (user.organisationId) {
        const org = await storage.getOrganization(user.organisationId);
        organizationName = org?.name || null;
      }
      
      if (user.stationId) {
        const station = await storage.getStation(user.stationId);
        stationName = station?.name || null;
      }


      
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        organizationId: user.organisationId,
        stationId: user.stationId,
        organizationName,
        stationName,
        isActive: user.isActive,
        createdAt: user.dataValues.createdAt,
        profilePicture: user.profilePicture
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Update profile
  app.put("/api/profile", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, phone } = req.body;
      const userId = req.user.userId;

      const updatedUser = await storage.updateUser(userId, {
        firstName,
        lastName,
        email,
        phone,
      });

      res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Update profile picture
  app.post("/api/profile/picture", authenticateToken, async (req: Request, res: Response) => {
    console.log('Profile picture upload endpoint hit');
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('Request body size:', JSON.stringify(req.body || {}).length);
    
    try {
      const userId = req.user.userId;
      console.log('User ID from token:', userId);
      
      // Check if file data is present in request body
      if (!req.body || !req.body.file) {
        return res.status(400).json({ error: "No file data provided" });
      }
      
      const { file: base64Data, fileName, fileType } = req.body;
      
      // Validate file data
      if (!base64Data || !fileName) {
        return res.status(400).json({ error: 'Invalid file data' });
      }
      
      // Check file type
      if (!fileType || !fileType.startsWith('image/')) {
        return res.status(400).json({ error: 'Only image files are allowed' });
      }
      
      console.log('Profile picture upload started:', { userId, fileName, fileType });
      
      // Create uploads directory if it doesn't exist
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const extension = fileName.split('.').pop() || 'jpg';
      const filename = `profile-${userId}-${timestamp}.${extension}`;
      const filepath = path.join(uploadsDir, filename);
      
      // Convert base64 to buffer and save file
      try {
        console.log('Base64 data length:', base64Data.length);
        const base64Content = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
        console.log('Base64 content length after cleanup:', base64Content.length);
        
        const buffer = Buffer.from(base64Content, 'base64');
        console.log('Buffer size:', buffer.length);
        
        fs.writeFileSync(filepath, buffer);
        
        console.log(`Profile picture saved: ${filepath}`);
        console.log('File size on disk:', fs.statSync(filepath).size);
      } catch (fileError) {
        console.error('Error saving file:', fileError);
        console.error('File error details:', {
          message: fileError.message,
          code: fileError.code,
          errno: fileError.errno,
          path: fileError.path
        });
        throw new Error(`Failed to save profile picture: ${fileError.message}`);
      }
      
      const profilePictureUrl = `/uploads/${filename}`;
      
      // Update user profile with picture URL
      await storage.updateUser(userId, {
        profilePicture: profilePictureUrl
      });
      
      res.json({ 
        message: "Profile picture updated successfully",
        profilePictureUrl 
      });
    } catch (error) {
      console.error("Error updating profile picture:", error);
      res.status(500).json({ error: "Failed to update profile picture" });
    }
  });

  // Emergency Contacts API routes
  
  // Get user's emergency contacts
  app.get("/api/emergency-contacts", authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = req.user.userId; // Keep as string UUID
      const contacts = await storage.getEmergencyContactsByUser(userId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching emergency contacts:", error);
      res.status(500).json({ error: "Failed to fetch emergency contacts" });
    }
  });

  // Create new emergency contact
  app.post("/api/emergency-contacts", authenticateToken, validateInput({
    body: z.object({
      name: z.string().min(1, "Name is required"),
      phone: z.string().min(1, "Phone is required"),
      relationship: z.string().min(1, "Relationship is required")
    })
  }), async (req: Request, res: Response) => {
    try {
      const userId = req.user.userId; // Keep as string UUID
      const { name, phone, relationship } = req.body;

      const newContact = await storage.createEmergencyContact({
        userId,
        name,
        phone,
        relationship
      });

      res.status(201).json(newContact);
    } catch (error) {
      console.error("Error creating emergency contact:", error);
      res.status(500).json({ error: "Failed to create emergency contact" });
    }
  });

  // Update emergency contact
  app.put("/api/emergency-contacts/:id", authenticateToken, validateInput({
    body: z.object({
      name: z.string().min(1).optional(),
      phone: z.string().min(1).optional(),
      relationship: z.string().min(1).optional()
    })
  }), async (req: Request, res: Response) => {
    try {
      const contactId = req.params.id; // Keep as string UUID
      const userId = req.user.userId; // Keep as string UUID
      const updates = req.body;

      const updatedContact = await storage.updateEmergencyContact(contactId, userId, updates);

      if (!updatedContact) {
        return res.status(404).json({ error: "Emergency contact not found or not authorized" });
      }

      res.json(updatedContact);
    } catch (error) {
      console.error("Error updating emergency contact:", error);
      res.status(500).json({ error: "Failed to update emergency contact" });
    }
  });

  // Delete emergency contact
  app.delete("/api/emergency-contacts/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const contactId = req.params.id; // Keep as string UUID
      const userId = req.user.userId; // Keep as string UUID

      const deleted = await storage.deleteEmergencyContact(contactId, userId);

      if (!deleted) {
        return res.status(404).json({ error: "Emergency contact not found or not authorized" });
      }

      res.status(204).send(); // No Content
    } catch (error) {
      console.error("Error deleting emergency contact:", error);
      res.status(500).json({ error: "Failed to delete emergency contact" });
    }
  });

  // Audit log routes
  app.get("/api/audit-logs", authenticateToken, requireRole(['main_admin', 'super_admin']), async (req: Request, res: Response) => {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const auditLogs = await storage.getAuditLogs(Number(limit), Number(offset));

      // Send notification about audit log access (security-sensitive)
      await sendUserNotification(req.user.userId, 'audit_logs_accessed', {
        recordCount: auditLogs.length,
        accessedBy: `${req.user.firstName} ${req.user.lastName}`,
        userRole: req.user.role
      }, storage);

      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/audit-logs/user/:userId", authenticateToken, requireRole(['main_admin', 'super_admin']), async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const auditLogs = await storage.getAuditLogsByUser(Number(userId));

      // Send notification about specific user audit log access (security-sensitive)
      await sendUserNotification(req.user.userId, 'user_audit_logs_accessed', {
        targetUserId: userId,
        recordCount: auditLogs.length,
        accessedBy: `${req.user.firstName} ${req.user.lastName}`,
        userRole: req.user.role
      }, storage);

      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching user audit logs:", error);
      res.status(500).json({ error: "Failed to fetch user audit logs" });
    }
  });

  // File upload routes
  app.post("/api/files/upload", authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileUpload = await storage.createFileUpload({
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileType: req.body.fileType || 'document',
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: req.file.path,
        uploadedBy: req.user.userId,
        relatedEntityType: req.body.relatedEntityType || null,
        relatedEntityId: req.body.relatedEntityId ? Number(req.body.relatedEntityId) : null,
      });

      // Send notification about file upload  
      await sendUserNotification(req.user.userId, 'file_uploaded', {
        fileName: req.file.originalname,
        fileType: req.body.fileType || 'document',
        fileSize: req.file.size
      }, storage);

      res.json({ 
        message: "File uploaded successfully",
        file: fileUpload 
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.get("/api/files/user/:userId", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Check permissions
      if (req.user.userId !== Number(userId) && !['main_admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const files = await storage.getFileUploadsByUser(Number(userId));
      res.json(files);
    } catch (error) {
      console.error("Error fetching user files:", error);
      res.status(500).json({ error: "Failed to fetch user files" });
    }
  });

  app.delete("/api/files/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const file = await storage.getFileUpload(Number(id));
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      // Check permissions
      if (file.uploadedBy !== req.user.userId && !['main_admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      await storage.deleteFileUpload(Number(id));
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Notification routes
  app.get("/api/notifications", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Return empty notifications for now to prevent 500 errors
      res.json([]);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Return empty unread notifications for now to prevent 500 errors
      res.json([]);
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      res.status(500).json({ error: "Failed to fetch unread notifications" });
    }
  });

  app.put("/api/notifications/:id/read", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(Number(id));
      
      // Notify via WebSocket if connected
      const ws = activeConnections.get(req.user.userId);
      if (ws) {
        ws.send(JSON.stringify({ type: 'notification_read', notificationId: id }));
      }
      
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.put("/api/notifications/read-all", authenticateToken, async (req: Request, res: Response) => {
    try {
      await storage.markAllNotificationsAsRead(req.user.userId);
      
      // Notify via WebSocket if connected
      const ws = activeConnections.get(req.user.userId);
      if (ws) {
        ws.send(JSON.stringify({ type: 'all_notifications_read' }));
      }
      
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  app.post("/api/notifications", authenticateToken, requireRole(['main_admin', 'super_admin', 'station_admin']), async (req: Request, res: Response) => {
    try {
      const notificationData = req.body;
      const notification = await storage.createNotification(notificationData);
      
      // Send real-time notification via WebSocket
      const ws = activeConnections.get(notification.userId);
      if (ws) {
        ws.send(JSON.stringify({
          type: 'new_notification',
          notification
        }));
      }
      
      res.json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  // Advanced analytics routes
  app.get("/api/analytics/advanced", authenticateToken, requireRole(['main_admin', 'super_admin']), async (req: Request, res: Response) => {
    try {
      const { timeframe = '30d' } = req.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get incident statistics by time
      const allIncidents = await storage.getAllIncidents();
      const filteredIncidents = allIncidents.filter(incident => 
        new Date(incident.created_at!) >= startDate && new Date(incident.created_at!) <= endDate
      );

      // Calculate response times and resolution rates
      const responseMetrics = {
        totalIncidents: filteredIncidents.length,
        averageResponseTime: calculateAverageResponseTime(filteredIncidents),
        resolutionRate: filteredIncidents.length > 0 ? filteredIncidents.filter(i => i.status === 'resolved').length / filteredIncidents.length * 100 : 0,
        priorityDistribution: {
          critical: filteredIncidents.filter(i => i.priority === 'critical').length,
          high: filteredIncidents.filter(i => i.priority === 'high').length,
          medium: filteredIncidents.filter(i => i.priority === 'medium').length,
          low: filteredIncidents.filter(i => i.priority === 'low').length,
        },
        statusDistribution: {
          pending: filteredIncidents.filter(i => i.status === 'pending').length,
          assigned: filteredIncidents.filter(i => i.status === 'assigned').length,
          in_progress: filteredIncidents.filter(i => i.status === 'in_progress').length,
          resolved: filteredIncidents.filter(i => i.status === 'resolved').length,
          escalated: filteredIncidents.filter(i => i.status === 'escalated').length,
        },
        dailyTrends: calculateDailyTrends(filteredIncidents, startDate, endDate)
      };

      // Log analytics access
      await storage.createAuditLog({
        userId: req.user.userId,
        action: 'view',
        entityType: 'analytics',
        entityId: null,
        details: JSON.stringify({
          timeframe: timeframe,
          totalIncidents: responseMetrics.totalIncidents,
          viewedBy: req.user.email
        }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined
      });

      // Send notification about analytics access
      await sendUserNotification(req.user.userId, 'analytics_accessed', {
        timeframe: timeframe,
        totalIncidents: responseMetrics.totalIncidents,
        userRole: req.user.role
      }, storage);
      
      res.json(responseMetrics);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to fetch advanced analytics" });
    }
  });

  // ===== CITIZEN/MOBILE APP ENDPOINTS =====

  // Get public incidents (for citizen app)
  app.get("/api/incidents/public", async (req: Request, res: Response) => {
    try {
      const incidents = await storage.getAllIncidents();
      
      // Return public incident data with upvotes and basic info
      const publicIncidents = await Promise.all(incidents.map(async (incident) => {
        const organization = incident.organisationId ? await storage.getOrganization(incident.organisationId) : null;
        const station = incident.stationId ? await storage.getStation(incident.stationId) : null;
        
        return {
          id: incident.id,
          title: incident.title,
          description: incident.description,
          status: incident.status,
          priority: incident.priority,
          location_address: incident.location?.address || null,
          location_lat: incident.location?.lat ? parseFloat(incident.location.lat.toString()) : null,
          location_lng: incident.location?.lng ? parseFloat(incident.location.lng.toString()) : null,
          photo_url: null, // Photo URL not available in current model
          upvotes: 0, // Upvotes not available in current model
          created_at: incident.createdAt,
          organization_name: organization?.name || null,
          station_name: station?.name || null
        };
      }));
      
      // Log public incident access for audit trail
      await logAuditEntry(req, 'view_public_incidents', 'incident', undefined, 200);
      
      res.json(publicIncidents);
    } catch (error) {
      console.error('Error fetching public incidents:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Submit incident from citizen app
  app.post("/api/incidents/citizen", upload.single('photo'), async (req: Request, res: Response) => {
    try {
      const { title, description, location_address, priority, location_lat, location_lng, reporter_name, reporter_phone, reporter_email, emergency_contacts } = req.body;
      
      // Debug logging to check what we're receiving
      console.log('🔍 DEBUG: Received reporter data:', {
        reporter_name,
        reporter_phone,
        reporter_email,
        emergency_contacts
      });
      
      // Debug logging right before SQL query
      console.log('🔍 DEBUG: SQL replacements object:', {
        reporterName: reporter_name || null,
        reporterPhone: reporter_phone || null,
        reporterEmail: reporter_email || null,
        reporterEmergencyContacts: emergency_contacts ? JSON.stringify(emergency_contacts) : null
      });
      
      // Validate required fields
      if (!title || !description || !location_address) {
        return res.status(400).json({ message: 'Title, description, and location are required' });
      }
      
      // Handle photo upload
      let photoUrl = null;
      if (req.file) {
        photoUrl = `/uploads/${req.file.filename}`;
      }
      
      // Get organizations and stations from database
      const organizations = await storage.getAllOrganizations();
      const stations = await storage.getAllStations();
      
      console.log('Available organizations:', organizations.map(org => ({ id: org.id, name: org.name })));
      console.log('Available stations:', stations.map(station => ({ id: station.id, name: station.name })));
      
      // Find appropriate organization based on incident type
      let targetOrganization = organizations.find(org => org.name.includes('Police')) || organizations[0];
      let targetStation = stations.find(station => station.name.includes('Remera')) || stations[0];
      
      if (!targetOrganization) {
        throw new Error('No organizations found in database');
      }
      if (!targetStation) {
        throw new Error('No stations found in database');
      }
      
      console.log('Selected organization:', { id: targetOrganization.id, name: targetOrganization.name });
      console.log('Selected station:', { id: targetStation.id, name: targetStation.name });
      
      // Enhanced intelligent incident assignment workflow
      const incidentText = `${title} ${description}`.toLowerCase();
      
      // Medical/Health emergencies → Ministry of Health
      if (incidentText.includes('medical') || incidentText.includes('health') || incidentText.includes('ambulance') ||
          incidentText.includes('hospital') || incidentText.includes('injury') || incidentText.includes('accident') ||
          incidentText.includes('injured') || incidentText.includes('sick') || incidentText.includes('emergency') ||
          incidentText.includes('heart') || incidentText.includes('breathing') || incidentText.includes('unconscious') ||
          incidentText.includes('bleeding') || incidentText.includes('pain') || incidentText.includes('doctor') ||
          incidentText.includes('nurse') || incidentText.includes('clinic') || incidentText.includes('healthcare') ||
          incidentText.includes('wound') || incidentText.includes('fever') || incidentText.includes('covid') ||
          incidentText.includes('virus') || incidentText.includes('disease') || incidentText.includes('medicine')) {
        targetOrganization = organizations.find(org => org.name.includes('Health')) || targetOrganization;
        console.log(`🏥 Medical Emergency: "${title}" → ${targetOrganization.name}`);
      }
      // Criminal/Investigation incidents → Rwanda Investigation Bureau
      else if (incidentText.includes('theft') || incidentText.includes('robbery') || incidentText.includes('fraud') ||
               incidentText.includes('investigation') || incidentText.includes('criminal') || incidentText.includes('scam') ||
               incidentText.includes('murder') || incidentText.includes('assault') || incidentText.includes('corruption') ||
               incidentText.includes('trafficking') || incidentText.includes('drug') || incidentText.includes('money laundering') ||
               incidentText.includes('embezzlement') || incidentText.includes('bribery') || incidentText.includes('extortion') ||
               incidentText.includes('kidnapping') || incidentText.includes('homicide') || incidentText.includes('rape') ||
               incidentText.includes('burglary') || incidentText.includes('forgery') || incidentText.includes('cybercrime')) {
        targetOrganization = organizations.find(org => org.name.includes('Investigation')) || targetOrganization;
        targetStation = stations.find(station => station.name.includes('Nyamirambo')) || targetStation;
        console.log(`🔍 Criminal Investigation: "${title}" → ${targetOrganization.name} (${targetStation.name})`);
      }
      // Fire-related incidents → Police (Emergency Response)
      else if (incidentText.includes('fire') || incidentText.includes('burn') || incidentText.includes('smoke') || 
               incidentText.includes('flames') || incidentText.includes('explosion') || incidentText.includes('burning') ||
               incidentText.includes('blazing') || incidentText.includes('ignite') || incidentText.includes('forest fire') ||
               incidentText.includes('arson') || incidentText.includes('wildfire') || incidentText.includes('gas leak')) {
        targetOrganization = organizations.find(org => org.name.includes('Police')) || targetOrganization;
        targetStation = stations.find(station => station.name.includes('Remera')) || targetStation;
        console.log(`🔥 Fire Emergency: "${title}" → ${targetOrganization.name} (Emergency Response)`);
      } 
      // General security/safety incidents → Police
      else {
        targetOrganization = organizations.find(org => org.name.includes('Police')) || targetOrganization;
        targetStation = stations.find(station => station.name.includes('Remera')) || targetStation;
        console.log(`👮 General Security: "${title}" → ${targetOrganization.name}`);
      }
      
      // Create incident with proper schema including reporter contact information
      const incident = await sequelize.query(
        `INSERT INTO incidents (
          id, title, description, type, priority, status, location, "stationId", 
          "organisationId", "reportedById", "reported_by", 
          "reporter_name", "reporter_phone", "reporter_email", "reporter_emergency_contacts",
          "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), :title, :description, :type, :priority, :status, :location, :stationId,
          :organisationId, :reportedById, :reportedBy, 
          :reporterName, :reporterPhone, :reporterEmail, :reporterEmergencyContacts,
          NOW(), NOW()
        ) RETURNING *`,
        {
          replacements: {
            title,
            description,
            type: 'other',
            priority: priority || 'medium',
            status: 'reported',
            location: JSON.stringify({
              address: location_address,
              lat: location_lat ? parseFloat(location_lat) : null,
              lng: location_lng ? parseFloat(location_lng) : null
            }),
            stationId: targetStation.id,
            organisationId: targetOrganization.id,
            reportedById: '00000000-0000-0000-0000-000000000000',
            reportedBy: 'Citizen Report',
            reporterName: reporter_name || null,
            reporterPhone: reporter_phone || null, 
            reporterEmail: reporter_email || null,
            reporterEmergencyContacts: emergency_contacts ? JSON.stringify(emergency_contacts) : null
          },
          type: QueryTypes.SELECT
        }
      );
      
      const createdIncident = incident[0];
      
      // Log citizen incident creation for audit trail
      await logAuditEntry(req, 'citizen_report', 'incident', createdIncident.id, 201);
      
      // Send notifications to relevant station admin and staff
      // Temporarily disabled for debugging
      // await sendIncidentNotification(createdIncident, 'created', { 
      //   userId: '00000000-0000-0000-0000-000000000000', // System user for citizen reports 
      //   firstName: 'System', 
      //   lastName: 'Citizen Report' 
      // }, storage);
      
      // TODO: Send emergency alerts based on priority
      if (priority === 'high') {
        // Send immediate alerts to relevant emergency services
        console.log(`HIGH PRIORITY INCIDENT REPORTED: ${title} at ${location_address}`);
      }
      
      res.status(201).json(createdIncident);
    } catch (error) {
      console.error('Error creating citizen incident:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Upvote incident
  app.post("/api/incidents/:id/upvote", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const incident = await storage.getIncident(id);
      
      if (!incident) {
        return res.status(404).json({ message: 'Incident not found' });
      }
      
      // Create upvote record in upvotes table
      await sequelize.query(
        `INSERT INTO upvotes ("userId", "incidentId", "createdAt") 
         VALUES (:userId, :incidentId, NOW()) 
         ON CONFLICT ("userId", "incidentId") DO NOTHING`,
        {
          replacements: {
            userId: '00000000-0000-0000-0000-000000000000', // Anonymous user
            incidentId: id
          },
          type: QueryTypes.INSERT
        }
      );
      
      // Log citizen upvote for audit trail
      await logAuditEntry(req, 'citizen_upvote', 'incident', id, 200);
      
      res.json({ message: 'Incident upvoted successfully' });
    } catch (error) {
      console.error('Error upvoting incident:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Geocoding API endpoints
  app.post("/api/geocode", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { address } = req.body;
      
      if (!address) {
        return res.status(400).json({ message: 'Address is required' });
      }
      
      const { geocodeAddress } = require('./utils/geocoding');
      const result = await geocodeAddress(address);
      
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ message: 'Location not found' });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      res.status(500).json({ message: 'Geocoding service error' });
    }
  });

  app.post("/api/reverse-geocode", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { lat, lng } = req.body;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: 'Latitude and longitude are required' });
      }
      
      const { reverseGeocode } = require('./utils/geocoding');
      const result = await reverseGeocode(parseFloat(lat), parseFloat(lng));
      
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ message: 'Address not found' });
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      res.status(500).json({ message: 'Reverse geocoding service error' });
    }
  });

  // Performance Analytics API Endpoints
  const performanceService = new PerformanceService(storage);
  
  // Citizen Follow-up Service
  const followUpService = new FollowUpService(storage);
  
  // Push Notification Service
  const pushNotificationService = new PushNotificationService(storage);
  
  // Get performance metrics
  app.get("/api/analytics/performance", authenticateToken, async (req: any, res: Response) => {
    try {
      const { timeframe = '30d', stationId, organizationId } = req.query;
      const user = req.user;
      
      // Role-based access control
      let finalStationId = stationId ? parseInt(stationId as string) : undefined;
      let finalOrganizationId = organizationId ? parseInt(organizationId as string) : undefined;
      
      if (user.role === 'station_admin' || user.role === 'station_staff') {
        finalStationId = user.stationId;
        finalOrganizationId = user.organizationId;
      } else if (user.role === 'super_admin') {
        finalOrganizationId = user.organizationId;
      }
      
      const metrics = await performanceService.getPerformanceMetrics(
        timeframe as string,
        finalStationId,
        finalOrganizationId
      );
      
      // Log analytics access for audit trail
      await logAuditEntry(req, 'analytics_access', 'performance_metrics', null, 200, 
        `Accessed performance metrics with timeframe: ${timeframe}`);
      
      res.json(metrics);
    } catch (error) {
      console.error('Performance metrics error:', error);
      res.status(500).json({ message: 'Failed to fetch performance metrics' });
    }
  });
  
  // Get resource allocation data
  app.get("/api/analytics/resource-allocation", authenticateToken, async (req: any, res: Response) => {
    try {
      const { organizationId } = req.query;
      const user = req.user;
      
      let finalOrganizationId = organizationId ? parseInt(organizationId as string) : undefined;
      
      if (user.role === 'station_admin' || user.role === 'station_staff') {
        finalOrganizationId = user.organizationId;
      } else if (user.role === 'super_admin') {
        finalOrganizationId = user.organizationId;
      }
      
      const resourceData = await performanceService.getResourceAllocation(finalOrganizationId);
      
      // Log analytics access for audit trail
      await logAuditEntry(req, 'analytics_access', 'resource_allocation', null, 200, 
        `Accessed resource allocation data`);
      
      res.json(resourceData);
    } catch (error) {
      console.error('Resource allocation error:', error);
      res.status(500).json({ message: 'Failed to fetch resource allocation data' });
    }
  });
  
  // Get incident heatmap data
  app.get("/api/analytics/heatmap", authenticateToken, async (req: any, res: Response) => {
    try {
      const { timeframe = '30d', organizationId } = req.query;
      const user = req.user;
      
      let finalOrganizationId = organizationId ? parseInt(organizationId as string) : undefined;
      
      if (user.role === 'station_admin' || user.role === 'station_staff') {
        finalOrganizationId = user.organizationId;
      } else if (user.role === 'super_admin') {
        finalOrganizationId = user.organizationId;
      }
      
      const heatmapData = await performanceService.getIncidentHeatmapData(
        timeframe as string,
        finalOrganizationId
      );
      
      // Log analytics access for audit trail
      await logAuditEntry(req, 'analytics_access', 'incident_heatmap', null, 200, 
        `Accessed incident heatmap data with timeframe: ${timeframe}`);
      
      res.json(heatmapData);
    } catch (error) {
      console.error('Heatmap data error:', error);
      res.status(500).json({ message: 'Failed to fetch heatmap data' });
    }
  });
  
  // Get predictive analytics
  app.get("/api/analytics/predictive", authenticateToken, async (req: any, res: Response) => {
    try {
      const { organizationId } = req.query;
      const user = req.user;
      
      // Only allow main_admin and super_admin to access predictive analytics
      if (user.role !== 'main_admin' && user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied: Insufficient permissions for predictive analytics' });
      }
      
      let finalOrganizationId = organizationId ? parseInt(organizationId as string) : undefined;
      
      if (user.role === 'super_admin') {
        finalOrganizationId = user.organizationId;
      }
      
      const predictiveData = await performanceService.getPredictiveAnalytics(finalOrganizationId);
      
      // Log analytics access for audit trail
      await logAuditEntry(req, 'analytics_access', 'predictive_analytics', null, 200, 
        `Accessed predictive analytics data`);
      
      res.json(predictiveData);
    } catch (error) {
      console.error('Predictive analytics error:', error);
      res.status(500).json({ message: 'Failed to fetch predictive analytics' });
    }
  });

  // Citizen Follow-up API Endpoints
  
  // Register for incident follow-up
  app.post("/api/incidents/:id/follow-up", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { email, phone, notificationPreference = 'email' } = req.body;
      
      if (!email && !phone) {
        return res.status(400).json({ message: 'Email or phone number is required' });
      }
      
      const followUp = await followUpService.registerForFollowUp(
        Number(id),
        email,
        phone,
        notificationPreference
      );
      
      res.status(201).json({
        message: 'Successfully registered for incident follow-up',
        followUp
      });
    } catch (error) {
      console.error('Follow-up registration error:', error);
      res.status(500).json({ message: 'Failed to register for follow-up' });
    }
  });
  
  // Send incident update (admin only)
  app.post("/api/incidents/:id/update", authenticateToken, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { status, message } = req.body;
      const user = req.user;
      
      if (!status || !message) {
        return res.status(400).json({ message: 'Status and message are required' });
      }
      
      // Update incident status
      await storage.updateIncident(Number(id), { status });
      
      // Send follow-up notifications
      await followUpService.sendIncidentUpdate(
        Number(id),
        status,
        message,
        `${user.firstName} ${user.lastName}`
      );
      
      res.json({ message: 'Incident updated and notifications sent' });
    } catch (error) {
      console.error('Incident update error:', error);
      res.status(500).json({ message: 'Failed to update incident' });
    }
  });
  
  // Get follow-up statistics
  app.get("/api/follow-up/stats", authenticateToken, async (req: any, res: Response) => {
    try {
      const stats = await followUpService.getFollowUpStats();
      res.json(stats);
    } catch (error) {
      console.error('Follow-up stats error:', error);
      res.status(500).json({ message: 'Failed to get follow-up stats' });
    }
  });

  // Push Notification API Endpoints
  
  // Subscribe to incident notifications
  app.post("/api/incidents/:id/subscribe", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { pushToken, email, phone, notificationPreferences } = req.body;
      
      if (!pushToken && !email && !phone) {
        return res.status(400).json({ message: 'At least one contact method is required' });
      }
      
      const subscription = await pushNotificationService.subscribeToIncident(
        Number(id),
        { pushToken, email, phone, notificationPreferences }
      );
      
      res.status(201).json({
        message: 'Successfully subscribed to incident notifications',
        subscription
      });
    } catch (error) {
      console.error('Subscription error:', error);
      res.status(500).json({ message: 'Failed to subscribe to notifications' });
    }
  });
  
  // Send incident progress update (admin only)
  app.post("/api/incidents/:id/progress-update", authenticateToken, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { status, priority, message, location } = req.body;
      const user = req.user;
      
      if (!status || !message) {
        return res.status(400).json({ message: 'Status and message are required' });
      }
      
      // Update incident status in database
      await storage.updateIncident(Number(id), { status, priority });
      
      // Send real-time push notifications
      await pushNotificationService.sendIncidentProgressUpdate(
        Number(id),
        {
          status,
          priority,
          message,
          updatedBy: `${user.firstName} ${user.lastName}`,
          location
        }
      );
      
      res.json({ message: 'Progress update sent to all subscribers' });
    } catch (error) {
      console.error('Progress update error:', error);
      res.status(500).json({ message: 'Failed to send progress update' });
    }
  });
  
  // Mark incident as resolved and send detailed email
  app.post("/api/incidents/:id/resolve", authenticateToken, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { resolutionSummary, actionsToken, timeToResolution } = req.body;
      const user = req.user;
      
      if (!resolutionSummary) {
        return res.status(400).json({ message: 'Resolution summary is required' });
      }
      
      // Update incident status to resolved
      await storage.updateIncident(Number(id), { status: 'resolved' });
      
      // Send detailed resolution email
      await pushNotificationService.sendIncidentResolutionEmail(
        Number(id),
        {
          resolvedBy: `${user.firstName} ${user.lastName}`,
          resolutionSummary,
          actionsToken: actionsToken || [],
          timeToResolution: timeToResolution || 60,
          finalStatus: 'resolved'
        }
      );
      
      res.json({ message: 'Incident resolved and notifications sent' });
    } catch (error) {
      console.error('Resolution error:', error);
      res.status(500).json({ message: 'Failed to resolve incident' });
    }
  });
  
  // Unsubscribe from incident notifications
  app.post("/api/incidents/:id/unsubscribe", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { subscriptionId } = req.body;
      
      if (!subscriptionId) {
        return res.status(400).json({ message: 'Subscription ID is required' });
      }
      
      await pushNotificationService.unsubscribeFromIncident(subscriptionId, Number(id));
      
      res.json({ message: 'Successfully unsubscribed from notifications' });
    } catch (error) {
      console.error('Unsubscribe error:', error);
      res.status(500).json({ message: 'Failed to unsubscribe' });
    }
  });
  
  // Get notification statistics
  app.get("/api/notifications/stats", authenticateToken, async (req: any, res: Response) => {
    try {
      const stats = await pushNotificationService.getNotificationStats();
      res.json(stats);
    } catch (error) {
      console.error('Notification stats error:', error);
      res.status(500).json({ message: 'Failed to get notification stats' });
    }
  });

  // Send emergency alert
  app.post("/api/emergency/alert", async (req: Request, res: Response) => {
    try {
      const { emergencyType, location, message, contactPhone } = req.body;
      
      // Log emergency alert
      console.log('\n=== EMERGENCY ALERT ===');
      console.log(`Type: ${emergencyType}`);
      console.log(`Location: ${location}`);
      console.log(`Message: ${message}`);
      console.log(`Contact: ${contactPhone}`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      
      // Emergency service numbers in Rwanda
      const emergencyNumbers = {
        police: '100',
        fire: '101', 
        medical: '102',
        general: '112'
      };
      
      if (emergencyType === 'police' || emergencyType === 'fire' || emergencyType === 'medical') {
        console.log(`Calling ${emergencyNumbers[emergencyType]} for ${emergencyType} emergency`);
        console.log(`Alert sent to ${emergencyType} services`);
      }
      
      // This alert is for emergency service calling, not contact notification
      // Emergency alert logged for audit trail
      
      console.log('========================\n');

      // Log emergency alert for audit trail
      await logAuditEntry(req, 'emergency_alert', 'system', null, 200);
      
      // Send system notification about emergency alert
      await sendSystemNotification('emergency_alert_triggered', {
        alertType: emergencyType,
        message: message,
        location: location,
        contactPhone: contactPhone
      }, storage);
      
      res.json({ message: 'Emergency alert sent successfully' });
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Communication endpoints (Email and SMS)
  app.post("/api/communication/email", authenticateToken, validateInput({
    body: z.object({
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1)
    })
  }), async (req: Request, res: Response) => {
    try {
      const { to, subject, body } = req.body as EmailRequest;
      
      // Log communication attempt
      await storage.createAuditLog({
        userId: req.user.userId,
        action: 'send_email',
        entityType: 'communication',
        entityId: null,
        details: JSON.stringify({
          to,
          subject,
          sentBy: req.user.email
        }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined
      });

      const result = await sendEmailMessage({ to, subject, body });
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: 'Email sent successfully',
          id: result.id 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: result.error 
        });
      }
    } catch (error) {
      console.error('Email endpoint error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });

  app.post("/api/communication/sms", authenticateToken, validateInput({
    body: z.object({
      to: z.string().min(1),
      message: z.string().min(1)
    })
  }), async (req: Request, res: Response) => {
    try {
      const { to, message } = req.body as SMSRequest;
      
      // Log communication attempt
      await storage.createAuditLog({
        userId: req.user.userId,
        action: 'send_sms',
        entityType: 'communication',
        entityId: null,
        details: JSON.stringify({
          to,
          message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
          sentBy: req.user.email
        }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined
      });

      const result = await sendSMSMessage({ to, message });
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: 'SMS sent successfully',
          id: result.id 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: result.error 
        });
      }
    } catch (error) {
      console.error('SMS endpoint error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });

  // Emergency communication endpoint (combines email and SMS) - No auth required for emergency alerts
  app.post("/api/communication/emergency", validateInput({
    body: z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      location: z.string().min(1),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      recipients: z.object({
        emails: z.array(z.string().email()).optional(),
        phones: z.array(z.string()).optional()
      })
    })
  }), async (req: Request, res: Response) => {
    try {
      const { title, description, location, priority, recipients } = req.body;
      
      const results = {
        emails: [] as any[],
        sms: [] as any[]
      };

      // Send emergency emails
      if (recipients.emails && recipients.emails.length > 0) {
        const emailTemplate = generateEmergencyEmailTemplate(title, location, priority, description);
        
        for (const email of recipients.emails) {
          const emailResult = await sendEmailMessage({
            to: email,
            subject: `🚨 EMERGENCY ALERT - ${priority.toUpperCase()} PRIORITY`,
            body: emailTemplate
          });
          results.emails.push({ to: email, ...emailResult });
        }
      }

      // Send emergency SMS messages
      if (recipients.phones && recipients.phones.length > 0) {
        const smsMessage = generateEmergencySMSMessage(title, location, priority);
        
        for (const phone of recipients.phones) {
          const smsResult = await sendSMSMessage({
            to: phone,
            message: smsMessage
          });
          results.sms.push({ to: phone, ...smsResult });
        }
      }

      // Log emergency communication (no auth required, so userId is null)
      await storage.createAuditLog({
        userId: null, // No user context for emergency alerts
        action: 'emergency_notification',
        entityType: 'communication',
        entityId: null,
        details: JSON.stringify({
          title,
          priority,
          location,
          emailsSent: results.emails.length,
          smsSent: results.sms.length,
          sentBy: 'Emergency Alert System'
        }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined
      });

      res.json({ 
        success: true, 
        message: 'Emergency notifications sent',
        results 
      });
    } catch (error) {
      console.error('Emergency communication error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });

  // Password reset request
  app.post('/api/auth/reset-password', [
    body('email').isEmail().withMessage('Valid email is required'),
  ], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email } = req.body;

    try {
      // Check if user exists
      const user = await sequelize.query(
        'SELECT id, email, "firstName", "lastName" FROM users WHERE email = :email AND "isActive" = true',
        {
          replacements: { email },
          type: QueryTypes.SELECT
        }
      );

      // Always return the same message for security (don't reveal if email exists)
      const securityMessage = 'If the email exists in our system, you will receive a password reset link shortly.';

      if (user.length === 0) {
        return res.status(200).json({ message: securityMessage });
      }

      const foundUser = user[0] as any;

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      // Delete any existing reset tokens for this user first
      await sequelize.query(
        'DELETE FROM password_reset_tokens WHERE "userId" = :userId',
        { replacements: { userId: foundUser.id } }
      );

      // Store new reset token in database
      await sequelize.query(`
        INSERT INTO password_reset_tokens ("userId", token, "expiresAt", "isUsed", "createdAt") 
        VALUES (:userId, :token, :expiresAt, false, NOW())
      `, {
        replacements: {
          userId: foundUser.id,
          token: resetToken,
          expiresAt
        }
      });

      // Send password reset email
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      
      try {
        await sendPasswordResetEmail(foundUser.email, foundUser.firstName, resetUrl);
        
        // Log the action
        await logAuditEvent(foundUser.id, 'password_reset_requested', {
          email: foundUser.email,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        
        // Clean up the token if email fails
        await sequelize.query(
          'DELETE FROM password_reset_tokens WHERE "userId" = :userId',
          { replacements: { userId: foundUser.id } }
        );
        
        return res.status(500).json({ 
          message: 'Failed to send password reset email. Please try again later.' 
        });
      }

      res.status(200).json({ message: securityMessage });

    } catch (error) {
      console.error('Password reset request error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        cause: error.cause
      });
      res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Password reset confirmation
  app.post('/api/auth/reset-password/:token', [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { token } = req.params;
    const { password } = req.body;

    try {
      // Find valid reset token
      const resetTokenResult = await sequelize.query(`
        SELECT rt."userId", rt."expiresAt", rt."isUsed", u.email, u."firstName", u."lastName"
        FROM password_reset_tokens rt
        JOIN users u ON rt."userId" = u.id
        WHERE rt.token = :token 
          AND rt."expiresAt" > NOW() 
          AND rt."isUsed" = false
          AND u."isActive" = true
      `, {
        replacements: { token },
        type: QueryTypes.SELECT
      });

      if (resetTokenResult.length === 0) {
        return res.status(400).json({ 
          message: 'Invalid or expired reset token' 
        });
      }

      const resetData = resetTokenResult[0] as any;

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update user password
      await sequelize.query(
        'UPDATE users SET password = :password, "updatedAt" = NOW() WHERE id = :userId',
        {
          replacements: {
            password: hashedPassword,
            userId: resetData.userId
          }
        }
      );

      // Mark token as used
      await sequelize.query(
        'UPDATE password_reset_tokens SET "isUsed" = true WHERE token = :token',
        { replacements: { token } }
      );

      // Log the successful password reset
      await logAuditEvent(resetData.userId, 'password_reset_completed', {
        email: resetData.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Send confirmation email
      try {
        await sendPasswordResetConfirmationEmail(resetData.email, resetData.firstName);
      } catch (emailError) {
        console.error('Failed to send password reset confirmation email:', emailError);
        // Don't fail the request if confirmation email fails
      }

      res.status(200).json({ 
        message: 'Password reset successful. You can now login with your new password.' 
      });

    } catch (error) {
      console.error('Password reset confirmation error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Clean up expired reset tokens (should be called by a cron job)
  app.post('/api/auth/cleanup-reset-tokens', authenticateToken, requireRole(['main_admin']), async (req: Request, res: Response) => {
    try {
      const result = await sequelize.query(
        'DELETE FROM password_reset_tokens WHERE "expiresAt" < NOW() OR "isUsed" = true',
        { type: QueryTypes.DELETE }
      );

      res.status(200).json({ 
        message: 'Cleanup completed',
        deletedCount: Array.isArray(result) ? result.length : result
      });

    } catch (error) {
      console.error('Token cleanup error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Helper function to send password reset email
  async function sendPasswordResetEmail(email: string, firstName: string, resetUrl: string) {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Rindwa Emergency Platform</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007AFF; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #007AFF; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Rindwa Emergency Platform</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello ${firstName},</p>
            <p>We received a request to reset your password for your Rindwa Emergency Platform account.</p>
            <p>Click the button below to reset your password:</p>
            <p><a href="${resetUrl}" class="button">Reset Password</a></p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 3px;">${resetUrl}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Rindwa Emergency Platform. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
      Password Reset - Rindwa Emergency Platform
      
      Hello ${firstName},
      
      We received a request to reset your password for your Rindwa Emergency Platform account.
      
      Click the link below to reset your password:
      ${resetUrl}
      
      Security Notice:
      - This link will expire in 1 hour
      - If you didn't request this reset, please ignore this email
      - Never share this link with anyone
      
      © ${new Date().getFullYear()} Rindwa Emergency Platform. All rights reserved.
    `;

    await sendEmail({
      to: email,
      subject: '🔐 Password Reset - Rindwa Emergency Platform',
      html: emailHtml,
      text: emailText
    });
  }

  // Helper function to send password reset confirmation email
  async function sendPasswordResetConfirmationEmail(email: string, firstName: string) {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Successful - Rindwa Emergency Platform</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9f9f9; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Password Reset Successful</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <div class="success">
              <strong>Your password has been successfully reset!</strong>
            </div>
            <p>You can now login to your Rindwa Emergency Platform account using your new password.</p>
            <p>If you did not perform this action, please contact our support team immediately.</p>
            <p><strong>Security Tips:</strong></p>
            <ul>
              <li>Use a strong, unique password</li>
              <li>Don't share your password with anyone</li>
              <li>Consider using a password manager</li>
              <li>Log out from shared devices</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Rindwa Emergency Platform. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: email,
      subject: '✅ Password Reset Successful - Rindwa Emergency Platform',
      html: emailHtml,
      text: `Password Reset Successful\n\nHello ${firstName},\n\nYour password has been successfully reset! You can now login to your Rindwa Emergency Platform account using your new password.\n\nIf you did not perform this action, please contact our support team immediately.`
    });
  }

  const httpServer = createServer(app);
  
  // Setup WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'authenticate' && data.token) {
          // Verify JWT token and associate with user
          jwt.verify(data.token, JWT_SECRET, (err: any, decoded: any) => {
            if (!err && decoded) {
              activeConnections.set(decoded.userId, ws);
              ws.send(JSON.stringify({ type: 'authenticated', userId: decoded.userId }));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove from active connections
      for (const [userId, connection] of activeConnections.entries()) {
        if (connection === ws) {
          activeConnections.delete(userId);
          break;
        }
      }
    });
  });

  return httpServer;
}
