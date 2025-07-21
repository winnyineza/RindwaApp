import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email().toLowerCase();
export const passwordSchema = z.string().min(6).max(128);
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/).optional();

// User validation schemas
export const userCreationSchema = z.object({
  email: emailSchema,
  password: passwordSchema.optional(),
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().min(2).max(100).optional(),
  phone: phoneSchema,
  role: z.enum(['main_admin', 'super_admin', 'station_admin', 'station_staff', 'citizen']),
  organizationId: z.number().positive().optional(),
  stationId: z.number().positive().optional(),
});

export const userUpdateSchema = userCreationSchema.partial();

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Organization validation schemas
export const organizationCreationSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
});

export const organizationUpdateSchema = organizationCreationSchema.partial();

// Station validation schemas
export const stationCreationSchema = z.object({
  name: z.string().min(2).max(200),
  organizationId: z.number().positive(),
  region: z.string().min(2).max(100),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  address: z.string().max(500).optional(),
  phone: phoneSchema,
});

export const stationUpdateSchema = stationCreationSchema.partial();

// Incident validation schemas
export const incidentCreationSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  locationAddress: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
});

export const incidentUpdateSchema = incidentCreationSchema.partial().extend({
  status: z.enum(['pending', 'assigned', 'in_progress', 'resolved', 'escalated']).optional(),
  assignedToId: z.number().positive().optional(),
});

// Citizen incident reporting schema
export const citizenIncidentSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  locationAddress: z.string().max(500).optional(),
  contactPhone: phoneSchema,
  contactEmail: emailSchema.optional(),
});

// Invitation validation schemas
export const invitationCreationSchema = z.object({
  email: emailSchema,
  role: z.enum(['super_admin', 'station_admin', 'station_staff']),
  organizationId: z.number().positive().optional(),
  stationId: z.number().positive().optional(),
});

export const invitationAcceptanceSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  password: passwordSchema,
  phone: phoneSchema,
});

// File upload validation schemas
export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  size: z.number().positive().max(10 * 1024 * 1024), // 10MB
  entityType: z.enum(['user', 'incident', 'organization', 'station']).optional(),
  entityId: z.number().positive().optional(),
});

// Notification validation schemas
export const notificationCreationSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  type: z.enum(['info', 'warning', 'error', 'success']),
  userId: z.number().positive().optional(),
  targetRole: z.enum(['main_admin', 'super_admin', 'station_admin', 'station_staff', 'citizen']).optional(),
  organizationId: z.number().positive().optional(),
  stationId: z.number().positive().optional(),
});

// Query parameter validation schemas
export const paginationSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).default('10'),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const filterSchema = z.object({
  status: z.enum(['pending', 'assigned', 'in_progress', 'resolved', 'escalated']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  organizationId: z.number().positive().optional(),
  stationId: z.number().positive().optional(),
  assignedToId: z.number().positive().optional(),
});

// Password reset validation schemas
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetSchema = z.object({
  password: passwordSchema,
  confirmPassword: passwordSchema,
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Validation utilities
export const validateRequest = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): T => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };
};

export const validatePartialRequest = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): Partial<T> => {
    try {
      return schema.partial().parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };
};

// Sanitization utilities
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const sanitizeInput = <T extends Record<string, any>>(input: T): T => {
  const sanitized = { ...input };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]);
    }
  }
  
  return sanitized;
};

// Common validation errors
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string = 'Resource already exists') {
    super(message);
    this.name = 'ConflictError';
  }
}