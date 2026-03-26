import { z } from "zod";

export const leadStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "CLOSED",
  "NO_INTEREST",
]);

export const leadCreateSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  phoneNumber: z.string().trim().min(3).max(50),
  website: z.string().trim().url().optional().or(z.literal("")),
  googleMapsUrl: z.string().trim().url().optional().or(z.literal("")),
  contactPerson: z.string().trim().max(200).optional().or(z.literal("")),
  tags: z.string().trim().max(300).optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
  status: leadStatusSchema.optional(),
});

export const leadUpdateSchema = leadCreateSchema
  .partial()
  .extend({ status: leadStatusSchema.optional() });

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;

export function normalizePhoneNumber(raw: string) {
  return raw.replace(/[^\d+]/g, "");
}

