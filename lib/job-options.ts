// lib/job-options.ts

export const SENIORITY_OPTIONS = [
  "Entry-Level",
  "Mid-Level",
  "Senior-Level",
] as const;

export const SALARY_BANDS = [
  { value: "11532-20000", label: "11,532 – 20,000" },
  { value: "20001-30000", label: "20,001 – 30,000" },
  { value: "30001-45000", label: "30,001 – 45,000" },
  { value: "45001-60000", label: "45,001 – 60,000" },
  { value: "60000+", label: "60,000+" },
] as const;

/**
 * Replace this array with your full category list (minimum 1, maximum 3 selected per job).
 * I used a small starter list because I don’t have the attached full list in this chat.
 */
export const JOB_CATEGORIES = [
  "Accounting",
  "Administration",
  "Customer Service",
  "Engineering",
  "Finance",
  "Human Resources",
  "IT",
  "Marketing",
  "Operations",
  "Sales",
] as const;
