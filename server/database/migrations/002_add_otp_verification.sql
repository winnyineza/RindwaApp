-- Migration: Add OTP verification system
-- Date: 2025-01-26
-- Description: Adds OTP verification tables for mobile user registration with dual delivery (SMS and Email)

-- Create OTP verification codes table
CREATE TABLE IF NOT EXISTS otp_verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    code_hash VARCHAR(255) NOT NULL, -- Hashed version for security
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('sms', 'email', 'dual')),
    purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('registration', 'login', 'password_reset', 'phone_verification')),
    is_verified BOOLEAN DEFAULT false,
    is_used BOOLEAN DEFAULT false,
    verification_attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional security fields
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    
    -- Metadata for tracking
    metadata JSONB
);

-- Create pending user registrations table (temporary storage before OTP verification)
CREATE TABLE IF NOT EXISTS pending_user_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    otp_verification_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'citizen',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (otp_verification_id) REFERENCES otp_verification_codes(id) ON DELETE CASCADE
);

-- Create OTP delivery logs table (for audit and debugging)
CREATE TABLE IF NOT EXISTS otp_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    otp_verification_id UUID NOT NULL,
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('sms', 'email')),
    recipient VARCHAR(255) NOT NULL, -- email or phone
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'expired')),
    provider VARCHAR(50), -- twilio, sendgrid, etc.
    provider_message_id VARCHAR(255),
    error_message TEXT,
    delivery_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (otp_verification_id) REFERENCES otp_verification_codes(id) ON DELETE CASCADE
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_otp_verification_email ON otp_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_verification_phone ON otp_verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_verification_code_hash ON otp_verification_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_otp_verification_expires ON otp_verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_verification_is_used ON otp_verification_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_otp_verification_purpose ON otp_verification_codes(purpose);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_user_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_phone ON pending_user_registrations(phone);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_expires ON pending_user_registrations(expires_at);

CREATE INDEX IF NOT EXISTS idx_otp_delivery_logs_verification_id ON otp_delivery_logs(otp_verification_id);
CREATE INDEX IF NOT EXISTS idx_otp_delivery_logs_status ON otp_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_otp_delivery_logs_method ON otp_delivery_logs(delivery_method);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_otp_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_otp_verification_codes_updated_at
    BEFORE UPDATE ON otp_verification_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_otp_verification_updated_at();

-- Cleanup function for expired OTP codes (to be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_otp_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired OTP codes and related data
    WITH deleted AS (
        DELETE FROM otp_verification_codes 
        WHERE expires_at < CURRENT_TIMESTAMP 
        AND (is_used = true OR is_verified = false)
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Delete expired pending registrations
    DELETE FROM pending_user_registrations 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE otp_verification_codes IS 'Stores OTP verification codes for user registration and authentication';
COMMENT ON TABLE pending_user_registrations IS 'Temporarily stores user registration data pending OTP verification';
COMMENT ON TABLE otp_delivery_logs IS 'Logs OTP delivery attempts for audit and debugging purposes';
COMMENT ON FUNCTION cleanup_expired_otp_codes() IS 'Cleanup function to remove expired OTP codes and pending registrations'; 