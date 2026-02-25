import { z } from "zod";

export const CompanyStatus = z.enum(["all", "active", "inactive"]);

export const JobStatus = z.enum(["all", "open", "closed", "draft"]);

export const CreateCompanySchema = z.object({
  refId: z.string().trim().min(1, "Ref ID is required"),
  name: z.string().trim().min(1, "Company Name is required"),
  description: z.string().trim().optional().or(z.literal("")),
  industry: z.string().trim().optional().or(z.literal("")),
  website: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean().optional(),

  contactFirstName: z.string().trim().min(1, "Contact First Name is required"),
  contactLastName: z.string().trim().min(1, "Contact Last Name is required"),
  contactEmail: z.string().trim().email("Valid contact email is required"),
  contactRole: z.string().trim().optional().or(z.literal("")),
  contactPhone: z.string().trim().optional().or(z.literal("")),
});

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;

export const CreateJobSchema = z.object({
  companyId: z.string().uuid("Valid company is required"),
  refId: z.string().trim().optional().or(z.literal("")),
  title: z.string().trim().min(1, "Job Title is required"),
  status: z.enum(["open", "closed", "draft"]).default("open"),
  location: z.string().trim().optional().or(z.literal("")),
  basis: z.string().trim().optional().or(z.literal("")),
  seniority: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;
