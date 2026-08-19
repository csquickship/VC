import { z } from 'zod';

export const createMeetingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title cannot be empty')
    .max(120, 'Title must be at most 120 characters long')
    .optional()
    .default('Quick Meeting'),
});

export const meetingCodeParamSchema = z.object({
  meetingCode: z
    .string({ required_error: 'Meeting code is required' })
    .trim()
    .min(3, 'Meeting code must be at least 3 characters long')
    .max(64, 'Meeting code must be at most 64 characters long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Meeting code contains invalid characters'),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
