import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../db';
import { sendSMSMessage } from '../communication';
import { sendEmail } from '../email';

export interface OTPRequest {
  email: string;
  phone: string;
  purpose: 'registration' | 'login' | 'password_reset' | 'phone_verification';
  deliveryMethod: 'sms' | 'email' | 'dual';
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export interface OTPVerification {
  email: string;
  phone: string;
  otpCode: string;
  purpose: 'registration' | 'login' | 'password_reset' | 'phone_verification';
}

export interface PendingRegistration {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface OTPResult {
  success: boolean;
  otpId?: string;
  message: string;
  expiresAt?: Date;
  deliveryStatus?: {
    sms?: { success: boolean; message: string; messageId?: string };
    email?: { success: boolean; message: string; messageId?: string };
  };
}

export interface VerificationResult {
  success: boolean;
  message: string;
  remainingAttempts?: number;
  isExpired?: boolean;
  isUsed?: boolean;
}

export class OTPService {
  private readonly OTP_EXPIRY_MINUTES = 2;
  private readonly MAX_ATTEMPTS = 3;
  private readonly OTP_LENGTH = 6;

  /**
   * Generate a secure numeric OTP code
   */
  private generateOTPCode(): string {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < this.OTP_LENGTH; i++) {
      const randomIndex = crypto.randomInt(0, digits.length);
      otp += digits[randomIndex];
    }
    
    // Ensure OTP doesn't start with 0 and has good randomness
    if (otp.startsWith('0')) {
      otp = crypto.randomInt(1, 10) + otp.slice(1);
    }
    
    return otp;
  }

  /**
   * Hash OTP code for secure storage
   */
  private async hashOTPCode(code: string): Promise<string> {
    return await bcrypt.hash(code, 10);
  }

  /**
   * Verify OTP code against hash
   */
  private async verifyOTPCode(code: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(code, hash);
  }

  /**
   * Generate and send OTP with dual delivery support
   */
  async generateAndSendOTP(request: OTPRequest): Promise<OTPResult> {
    const transaction = await sequelize.transaction();
    
    try {
      // Generate OTP code
      const otpCode = this.generateOTPCode();
      const codeHash = await this.hashOTPCode(otpCode);
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Check for existing active OTP
      const existingOTP = await sequelize.query(
        `SELECT id FROM otp_verification_codes 
         WHERE (email = :email OR phone = :phone) 
         AND purpose = :purpose 
         AND expires_at > CURRENT_TIMESTAMP 
         AND is_used = false
         ORDER BY created_at DESC 
         LIMIT 1`,
        {
          replacements: { 
            email: request.email, 
            phone: request.phone, 
            purpose: request.purpose 
          },
          type: QueryTypes.SELECT,
          transaction
        }
      ) as any[];

      if (existingOTP.length > 0) {
        await transaction.rollback();
        return {
          success: false,
          message: 'An active OTP already exists. Please wait before requesting a new one.'
        };
      }

      // Store OTP in database
      const otpInsertResult = await sequelize.query(
        `INSERT INTO otp_verification_codes 
         (email, phone, otp_code, code_hash, delivery_method, purpose, expires_at, ip_address, user_agent, metadata)
         VALUES (:email, :phone, :otpCode, :codeHash, :deliveryMethod, :purpose, :expiresAt, :ipAddress, :userAgent, :metadata)
         RETURNING id`,
        {
          replacements: {
            email: request.email,
            phone: request.phone,
            otpCode, // Store plain text temporarily for immediate delivery
            codeHash,
            deliveryMethod: request.deliveryMethod,
            purpose: request.purpose,
            expiresAt,
            ipAddress: request.ipAddress || null,
            userAgent: request.userAgent || null,
            metadata: request.metadata ? JSON.stringify(request.metadata) : null
          },
          type: QueryTypes.SELECT,
          transaction
        }
      ) as any[];

      const otpId = otpInsertResult[0]?.id;
      
      if (!otpId) {
        await transaction.rollback();
        return {
          success: false,
          message: 'Failed to create OTP record'
        };
      }

      // Prepare delivery results
      const deliveryStatus: any = {};

      // Send via SMS if requested
      if (request.deliveryMethod === 'sms' || request.deliveryMethod === 'dual') {
        try {
          const smsMessage = `🔐 Your Rindwa Emergency verification code is: ${otpCode}\n\nThis code expires in ${this.OTP_EXPIRY_MINUTES} minutes. For security, do not share this code with anyone.\n\nIf you didn't request this, please ignore this message.`;
          
                     const smsResult = await sendSMSMessage({ 
             to: request.phone, 
             message: smsMessage 
           });
           
           deliveryStatus.sms = {
             success: smsResult.success,
             message: smsResult.error || 'SMS sent successfully',
             messageId: smsResult.id
           };

           // Log SMS delivery attempt
           await sequelize.query(
             `INSERT INTO otp_delivery_logs 
              (otp_verification_id, delivery_method, recipient, status, provider, provider_message_id, error_message)
              VALUES (:otpVerificationId, 'sms', :phone, :status, 'twilio', :messageId, :errorMessage)`,
             {
               replacements: {
                 otpVerificationId: otpId,
                 phone: request.phone,
                 status: smsResult.success ? 'sent' : 'failed',
                 messageId: smsResult.id || null,
                 errorMessage: smsResult.success ? null : smsResult.error
               },
               type: QueryTypes.INSERT,
               transaction
             }
           );
        } catch (error) {
          console.error('SMS delivery failed:', error);
          deliveryStatus.sms = {
            success: false,
            message: 'SMS delivery failed'
          };
        }
      }

      // Send via Email if requested
      if (request.deliveryMethod === 'email' || request.deliveryMethod === 'dual') {
        try {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
              <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #dc2626; margin: 0; font-size: 28px;">🔐 Verification Code</h1>
                  <p style="color: #6b7280; margin: 10px 0 0 0;">Rindwa Emergency Platform</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <div style="display: inline-block; background-color: #f3f4f6; border: 2px dashed #dc2626; border-radius: 10px; padding: 20px 30px; font-size: 32px; font-weight: bold; color: #dc2626; letter-spacing: 8px;">
                    ${otpCode}
                  </div>
                </div>
                
                <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <p style="margin: 0; color: #991b1b; font-weight: 500;">⏰ This code expires in ${this.OTP_EXPIRY_MINUTES} minutes</p>
                </div>
                
                <div style="margin: 25px 0;">
                  <h3 style="color: #374151; margin-bottom: 10px;">Instructions:</h3>
                  <ol style="color: #6b7280; padding-left: 20px;">
                    <li>Enter this code in the Rindwa Emergency mobile app</li>
                    <li>Complete your registration to access emergency services</li>
                    <li>Do not share this code with anyone</li>
                  </ol>
                </div>
                
                <div style="background-color: #f9fafb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    <strong>Security Notice:</strong> If you didn't request this verification code, please ignore this email. 
                    The code will expire automatically in ${this.OTP_EXPIRY_MINUTES} minutes.
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    Rindwa Emergency Platform - Keeping Rwanda Safe<br>
                    This is an automated message, please do not reply.
                  </p>
                </div>
              </div>
            </div>
          `;

                     const emailResult = await sendEmail({
             to: request.email,
             from: 'w.ineza@alustudent.com',
             subject: `🔐 Your Rindwa Emergency Verification Code: ${otpCode}`,
             html: emailHtml,
             text: `Your Rindwa Emergency verification code is: ${otpCode}\n\nThis code expires in ${this.OTP_EXPIRY_MINUTES} minutes.\nFor security, do not share this code with anyone.\n\nIf you didn't request this, please ignore this message.`
           });

           deliveryStatus.email = {
             success: emailResult,
             message: emailResult ? 'Email sent successfully' : 'Email delivery failed',
             messageId: null // Email service doesn't return message ID
           };

           // Log email delivery attempt
           await sequelize.query(
             `INSERT INTO otp_delivery_logs 
              (otp_verification_id, delivery_method, recipient, status, provider, provider_message_id, error_message)
              VALUES (:otpVerificationId, 'email', :email, :status, 'sendgrid', :messageId, :errorMessage)`,
             {
               replacements: {
                 otpVerificationId: otpId,
                 email: request.email,
                 status: emailResult ? 'sent' : 'failed',
                 messageId: null,
                 errorMessage: emailResult ? null : 'Email delivery failed'
               },
               type: QueryTypes.INSERT,
               transaction
             }
           );
        } catch (error) {
          console.error('Email delivery failed:', error);
          deliveryStatus.email = {
            success: false,
            message: 'Email delivery failed'
          };
        }
      }

      // Clear the plain text OTP from database after sending
      await sequelize.query(
        `UPDATE otp_verification_codes SET otp_code = '' WHERE id = :otpId`,
        {
          replacements: { otpId },
          type: QueryTypes.UPDATE,
          transaction
        }
      );

      await transaction.commit();

      // Check if at least one delivery method succeeded
      const hasSuccessfulDelivery = 
        (deliveryStatus.sms?.success) || 
        (deliveryStatus.email?.success);

      if (!hasSuccessfulDelivery) {
        return {
          success: false,
          message: 'Failed to deliver OTP via any method',
          deliveryStatus
        };
      }

      return {
        success: true,
        otpId,
        message: 'OTP sent successfully',
        expiresAt,
        deliveryStatus
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Error generating OTP:', error);
      return {
        success: false,
        message: 'Failed to generate and send OTP'
      };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(verification: OTPVerification): Promise<VerificationResult> {
    const transaction = await sequelize.transaction();

    try {
      // Find the OTP record
      const [otpRecord] = await sequelize.query(
        `SELECT id, code_hash, verification_attempts, max_attempts, expires_at, is_verified, is_used
         FROM otp_verification_codes
         WHERE (email = :email OR phone = :phone)
         AND purpose = :purpose
         AND is_used = false
         ORDER BY created_at DESC
         LIMIT 1`,
        {
          replacements: {
            email: verification.email,
            phone: verification.phone,
            purpose: verification.purpose
          },
          type: QueryTypes.SELECT,
          transaction
        }
      ) as any[];

      if (!otpRecord) {
        await transaction.rollback();
        return {
          success: false,
          message: 'No valid OTP found. Please request a new one.'
        };
      }

      const otp = otpRecord as any;

      // Check if expired
      if (new Date() > new Date(otp.expires_at)) {
        await transaction.rollback();
        return {
          success: false,
          message: 'OTP has expired. Please request a new one.',
          isExpired: true
        };
      }

      // Check if already used
      if (otp.is_used || otp.is_verified) {
        await transaction.rollback();
        return {
          success: false,
          message: 'OTP has already been used.',
          isUsed: true
        };
      }

      // Check attempts
      if (otp.verification_attempts >= otp.max_attempts) {
        await transaction.rollback();
        return {
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.',
          remainingAttempts: 0
        };
      }

      // Increment attempt count
      await sequelize.query(
        `UPDATE otp_verification_codes 
         SET verification_attempts = verification_attempts + 1
         WHERE id = :id`,
        {
          replacements: { id: otp.id },
          type: QueryTypes.UPDATE,
          transaction
        }
      );

      // Verify the code
      const isValidCode = await this.verifyOTPCode(verification.otpCode, otp.code_hash);

      if (!isValidCode) {
        await transaction.commit();
        const remainingAttempts = otp.max_attempts - (otp.verification_attempts + 1);
        return {
          success: false,
          message: `Invalid OTP code. ${remainingAttempts} attempts remaining.`,
          remainingAttempts
        };
      }

      // Mark as verified
      await sequelize.query(
        `UPDATE otp_verification_codes 
         SET is_verified = true, verified_at = CURRENT_TIMESTAMP
         WHERE id = :id`,
        {
          replacements: { id: otp.id },
          type: QueryTypes.UPDATE,
          transaction
        }
      );

      await transaction.commit();

      return {
        success: true,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        message: 'Failed to verify OTP'
      };
    }
  }

  /**
   * Store pending user registration
   */
  async storePendingRegistration(
    email: string, 
    phone: string, 
    registration: PendingRegistration
  ): Promise<{ success: boolean; message: string }> {
    const transaction = await sequelize.transaction();

    try {
      // Find the verified OTP
      const [otpRecord] = await sequelize.query(
        `SELECT id FROM otp_verification_codes
         WHERE (email = :email OR phone = :phone)
         AND purpose = 'registration'
         AND is_verified = true
         AND is_used = false
         AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at DESC
         LIMIT 1`,
        {
          replacements: { email, phone },
          type: QueryTypes.SELECT,
          transaction
        }
      ) as any[];

      if (!otpRecord) {
        await transaction.rollback();
        return {
          success: false,
          message: 'No verified OTP found'
        };
      }

      const hashedPassword = await bcrypt.hash(registration.password, 10);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Store pending registration
      await sequelize.query(
        `INSERT INTO pending_user_registrations 
         (otp_verification_id, email, phone, first_name, last_name, password_hash, expires_at)
         VALUES (:otpVerificationId, :email, :phone, :firstName, :lastName, :passwordHash, :expiresAt)`,
        {
          replacements: {
            otpVerificationId: (otpRecord as any).id,
            email: registration.email,
            phone: registration.phone,
            firstName: registration.firstName,
            lastName: registration.lastName,
            passwordHash: hashedPassword,
            expiresAt
          },
          type: QueryTypes.INSERT,
          transaction
        }
      );

      await transaction.commit();

      return {
        success: true,
        message: 'Registration data stored successfully'
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Error storing pending registration:', error);
      return {
        success: false,
        message: 'Failed to store registration data'
      };
    }
  }

  /**
   * Complete user registration after OTP verification
   */
  async completeRegistration(
    email: string, 
    phone: string
  ): Promise<{ success: boolean; message: string; user?: any }> {
    const transaction = await sequelize.transaction();

    try {
      // Get pending registration
      const [pendingReg] = await sequelize.query(
        `SELECT pr.*, ovc.id as otp_id
         FROM pending_user_registrations pr
         JOIN otp_verification_codes ovc ON pr.otp_verification_id = ovc.id
         WHERE pr.email = :email 
         AND pr.phone = :phone
         AND pr.expires_at > CURRENT_TIMESTAMP
         AND ovc.is_verified = true
         AND ovc.is_used = false
         ORDER BY pr.created_at DESC
         LIMIT 1`,
        {
          replacements: { email, phone },
          type: QueryTypes.SELECT,
          transaction
        }
      ) as any[];

      if (!pendingReg) {
        await transaction.rollback();
        return {
          success: false,
          message: 'No pending registration found or OTP not verified'
        };
      }

      const registration = pendingReg as any;

      // Create user account
      const [user] = await sequelize.query(
        `INSERT INTO users 
         (email, password, "firstName", "lastName", phone, role, "isActive", "createdAt", "updatedAt")
         VALUES (:email, :password, :firstName, :lastName, :phone, :role, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, email, "firstName", "lastName", phone, role, "isActive"`,
        {
          replacements: {
            email: registration.email,
            password: registration.password_hash,
            firstName: registration.first_name,
            lastName: registration.last_name,
            phone: registration.phone,
            role: registration.role
          },
          type: QueryTypes.INSERT,
          transaction
        }
      ) as any[];

      // Mark OTP as used
      await sequelize.query(
        `UPDATE otp_verification_codes 
         SET is_used = true 
         WHERE id = :otpId`,
        {
          replacements: { otpId: registration.otp_id },
          type: QueryTypes.UPDATE,
          transaction
        }
      );

      // Clean up pending registration
      await sequelize.query(
        `DELETE FROM pending_user_registrations WHERE id = :id`,
        {
          replacements: { id: registration.id },
          type: QueryTypes.DELETE,
          transaction
        }
      );

      await transaction.commit();

      return {
        success: true,
        message: 'Registration completed successfully',
        user: user as any
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Error completing registration:', error);
      return {
        success: false,
        message: 'Failed to complete registration'
      };
    }
  }

  /**
   * Cleanup expired OTP codes
   */
  async cleanupExpiredCodes(): Promise<number> {
    try {
      const [result] = await sequelize.query(
        'SELECT cleanup_expired_otp_codes() as deleted_count',
        { type: QueryTypes.SELECT }
      ) as any[];

      return (result as any).deleted_count || 0;
    } catch (error) {
      console.error('Error cleaning up expired OTP codes:', error);
      return 0;
    }
  }
}

export const otpService = new OTPService(); 