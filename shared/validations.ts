import { z } from 'zod';

// === SHARED VALIDATION SCHEMAS ===
// These schemas are used by both frontend and backend for consistency

// Common field validations
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(254, 'Email must be less than 254 characters');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

export const phoneSchema = z
  .string()
  .optional()
  .refine((val) => !val || /^\+?[\d\s\-\(\)]+$/.test(val), {
    message: 'Please enter a valid phone number format'
  });

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and periods');

export const uuidSchema = z
  .string()
  .uuid('Please provide a valid ID');

// === USER VALIDATIONS ===
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  role: z.enum(['main_admin', 'super_admin', 'station_admin', 'station_staff', 'citizen'])
});

export const userLoginSchema = z.object({
  emailOrPhone: z.string()
    .min(1, 'Email or phone number is required')
    .refine((value) => {
      // Check if it's a valid email or phone number
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
      return emailRegex.test(value) || phoneRegex.test(value);
    }, 'Please enter a valid email address or phone number'),
  password: z.string().min(1, 'Password is required')
});

export const userUpdateSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
}).partial();

// === OTP VALIDATIONS ===
export const otpRequestSchema = z.object({
  email: emailSchema,
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number format'),
  purpose: z.enum(['registration', 'login', 'password_reset', 'phone_verification']),
  deliveryMethod: z.enum(['sms', 'email', 'dual']).default('dual')
});

export const otpVerificationSchema = z.object({
  email: emailSchema,
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number format'),
  otpCode: z
    .string()
    .length(6, 'OTP code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP code must contain only numbers'),
  purpose: z.enum(['registration', 'login', 'password_reset', 'phone_verification'])
});

export const mobileRegistrationSchema = z.object({
  email: emailSchema,
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number format'),
  firstName: nameSchema,
  lastName: nameSchema,
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// === INCIDENT VALIDATIONS ===
export const incidentCreationSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters')
    .trim(),
  type: z.enum(['fire', 'medical', 'police', 'other'], {
    errorMap: () => ({ message: 'Please select a valid incident type' })
  }),
  priority: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: 'Please select a valid priority level' })
  }),
  location: z.object({
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    address: z.string().min(5, 'Please provide a detailed address').max(500, 'Address too long')
  }),
  photo: z.any().optional() // File validation handled separately
});

export const incidentUpdateSchema = incidentCreationSchema.partial().extend({
  status: z.enum(['reported', 'assigned', 'in_progress', 'resolved', 'escalated']).optional(),
  assignedTo: uuidSchema.optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

// === ORGANIZATION VALIDATIONS ===
export const organizationCreationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(200, 'Organization name must be less than 200 characters')
    .trim(),
  type: z
    .string()
    .min(2, 'Organization type must be at least 2 characters')
    .max(100, 'Organization type must be less than 100 characters'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  email: emailSchema,
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(500, 'Address must be less than 500 characters'),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must be less than 100 characters'),
  country: z
    .string()
    .min(2, 'Country must be at least 2 characters')
    .max(100, 'Country must be less than 100 characters'),
  website: z
    .string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal(''))
});

// === STATION VALIDATIONS ===
export const stationCreationSchema = z.object({
  name: z
    .string()
    .min(2, 'Station name must be at least 2 characters')
    .max(200, 'Station name must be less than 200 characters')
    .trim(),
  organisationId: uuidSchema,
  district: z
    .string()
    .min(2, 'District must be at least 2 characters')
    .max(100, 'District must be less than 100 characters'),
  sector: z
    .string()
    .min(2, 'Sector must be at least 2 characters')
    .max(100, 'Sector must be less than 100 characters'),
  address: z
    .string()
    .max(500, 'Address must be less than 500 characters')
    .optional(),
  contactNumber: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid contact number')
    .optional(),
  capacity: z
    .number()
    .min(1, 'Capacity must be at least 1')
    .max(10000, 'Capacity seems too large')
    .optional()
});

// === INVITATION VALIDATIONS ===
export const invitationCreationSchema = z.object({
  email: emailSchema,
  role: z.enum(['super_admin', 'station_admin', 'station_staff'], {
    errorMap: () => ({ message: 'Please select a valid role' })
  }),
  organisationId: uuidSchema.optional(),
  stationId: uuidSchema.optional()
});

export const invitationAcceptanceSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// === UTILITY FUNCTIONS ===
export const getValidationErrors = (error: z.ZodError) => {
  return error.errors.reduce((acc, curr) => {
    const path = curr.path.join('.');
    acc[path] = curr.message;
    return acc;
  }, {} as Record<string, string>);
};

export const validateRequest = <T>(schema: z.ZodSchema<T>, data: unknown) => {
  try {
    return { success: true, data: schema.parse(data), errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, data: null, errors: getValidationErrors(error) };
    }
    throw error;
  }
};

// === EXPORT TYPES ===
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type OTPRequest = z.infer<typeof otpRequestSchema>;
export type OTPVerification = z.infer<typeof otpVerificationSchema>;
export type MobileRegistration = z.infer<typeof mobileRegistrationSchema>;
export type IncidentCreation = z.infer<typeof incidentCreationSchema>;
export type IncidentUpdate = z.infer<typeof incidentUpdateSchema>;
export type OrganizationCreation = z.infer<typeof organizationCreationSchema>;
export type StationCreation = z.infer<typeof stationCreationSchema>;
export type InvitationCreation = z.infer<typeof invitationCreationSchema>;
export type InvitationAcceptance = z.infer<typeof invitationAcceptanceSchema>; 