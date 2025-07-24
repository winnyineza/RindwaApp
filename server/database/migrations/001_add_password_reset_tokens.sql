-- Migration: Add password reset token support
-- Created: 2024-01-15
-- Description: Adds password reset token storage for secure password resets

-- Add password reset fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetPasswordToken" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetPasswordExpires" TIMESTAMP WITH TIME ZONE;

-- Create index for password reset token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users("resetPasswordToken");
CREATE INDEX IF NOT EXISTS idx_users_reset_expires ON users("resetPasswordExpires");

-- Create password reset audit log table
CREATE TABLE IF NOT EXISTS password_reset_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE,
    expired_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT false,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for password reset logs
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_user ON password_reset_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_email ON password_reset_logs(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_requested ON password_reset_logs(requested_at);

-- Add trigger to automatically clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up expired tokens older than 1 hour
    UPDATE users 
    SET "resetPasswordToken" = NULL, "resetPasswordExpires" = NULL
    WHERE "resetPasswordExpires" < CURRENT_TIMESTAMP - INTERVAL '1 hour';
    
    -- Mark expired logs
    UPDATE password_reset_logs
    SET expired_at = CURRENT_TIMESTAMP
    WHERE expired_at IS NULL 
    AND requested_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
    AND is_used = false;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs cleanup on insert
CREATE TRIGGER trigger_cleanup_expired_reset_tokens
    AFTER INSERT ON password_reset_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_expired_reset_tokens();

-- Add comment to document this migration
COMMENT ON TABLE password_reset_logs IS 'Stores password reset requests for audit and security tracking'; 