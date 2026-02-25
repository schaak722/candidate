import { z } from "zod";
import { JOB_CATEGORIES, SALARY_BANDS, SENIORITY_OPTIONS } from "@/lib/job-options";

export const CompanyStatus = z.enum(["all", "active", "inactive"]);
export const JobStatus = z.enum(["all", "open", "closed", "draft"]);

export const CreateCompanySchema = z.object({
  refId: z.string().trim().min(1, "Ref ID is required"),
  name: z.string().trim().min(1, "Company Name is required"),
  description: z.string().trim().optional().or(z.literal("")),
  industry: z.string().trim().optional().or(z.literal("")),
  website: z.string().trim().optional().or(z.literal("")),

  contactFirstName: z.string().trim().min(1, "Contact First Name is required"),
  contactLastName: z.string().trim().min(1, "Contact Last Name is required"),
  contactEmail: z.string().trim().email("Valid contact email is required"),
  contactRole: z.string().trim().optional().or(z.literal("")),
  contactPhone: z.string().trim().optional().or(z.literal("")),
});

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;

const SalaryBandValues = SALARY_BANDS.map((s) => s.value) as unknown as [string, ...string[]];
const CategoryValues = JOB_CATEGORIES.map((c) => c) as unknown as [string, ...string[]];
const SeniorityValues = SENIORITY_OPTIONS.map((s) => s) as unknown as [string, ...string[]];

function stripHtmlToText(html: string) {
  return (html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const CreateJobSchema = z.object({
  companyId: z.string().uuid("Valid company is required"),

  // Mandatory (*)
  refId: z.string().trim().min(1, "Job Ref ID is required"),
  title: z.string().trim().min(1, "Job Title is required"),
  basis: z.string().trim().min(1, "Basis is required"),

  // Defaults to Draft (not mandatory in your screenshot)
  status: z.enum(["open", "closed", "draft"]).default("draft"),

  // Optional
  location: z.string().trim().optional().or(z.literal("")),
  seniority: z.enum(SeniorityValues).optional(),
  salaryBands: z.array(z.enum(SalaryBandValues)).optional().default([]),

  // Mandatory (*)
  categories: z
    .array(z.enum(CategoryValues))
    .min(1, "Select at least 1 category")
    .max(3, "Select up to 3 categories"),

  // Mandatory (*)
  closingDate: z
    .string()
    .trim()
    .min(1, "Closing Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Closing Date must be YYYY-MM-DD"),

  // Mandatory (*)
  description: z
    .string()
    .trim()
    .refine((v) => stripHtmlToText(v).length > 0, "Job Description is required"),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;
