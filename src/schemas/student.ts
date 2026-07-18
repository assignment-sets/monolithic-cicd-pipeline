import { z } from "zod";

// --- Zod Schemas ---

/**
 * Zod schema for a Department object.
 */
export const DepartmentSchema = z.object({
  id: z.string().nonempty("Department ID is required."),
  name: z.string().nonempty("Department name is required."),
});

/**
 * Zod schema for the User object as fetched when getting Student data.
 */
export const UserDataForStudentSchema = z.object({
  email: z
    .string()
    .email("Invalid email format.")
    .nonempty("Email is required."),
  // Add other User fields if necessary (like role)
});

/**
 * Zod schema for the Student Profile data structure fetched by the Admin.
 * This is the object structure used in the table.
 */
export const StudentDataSchema = z.object({
  userId: z.string().nonempty("User ID is required."),
  name: z.string().nonempty("Name is required."),
  // Accepts Date object or ISO string (what the API usually returns)
  enrolledAt: z.union([z.string().datetime(), z.date()]),
  user: UserDataForStudentSchema,
  department: DepartmentSchema,
});

/**
 * Zod schema for the Admin list students API response.
 */
export const AdminStudentListResponseSchema = z.object({
  students: z.array(StudentDataSchema),
});

/**
 * Zod schema for creating a new student (POST payload).
 */
export const CreateStudentPayloadSchema = z.object({
  name: z.string().nonempty("Name is required."),
  email: z
    .string()
    .email("Invalid email format.")
    .nonempty("Email is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  departmentId: z.string().nonempty("Department selection is required."),
});

/**
 * Zod schema for updating an existing student (PUT payload).
 */
export const UpdateStudentPayloadSchema = z.object({
  name: z.string().nonempty("Name is required."),
  departmentId: z.string().nonempty("Department selection is required."),
});

// --- TypeScript Types derived from Zod Schemas ---

export type Department = z.infer<typeof DepartmentSchema>;
export type StudentData = z.infer<typeof StudentDataSchema>; // Type for table rows
export type StudentListResponse = z.infer<
  typeof AdminStudentListResponseSchema
>;
export type CreateStudentPayload = z.infer<typeof CreateStudentPayloadSchema>;
export type UpdateStudentPayload = z.infer<typeof UpdateStudentPayloadSchema>;

// Existing StudentMePage schemas (for student/page.tsx)
export const StudentProfileSchema = z.object({
  clerkId: z.string().nonempty("Clerk ID is required."),
  email: z
    .string()
    .email("Invalid email format.")
    .nonempty("Email is required."),
  role: z.string().nonempty("Role is required."),
  name: z.string().nonempty("Name is required."),
  enrolledAt: z
    .string()
    .datetime({ message: "Invalid date format for enrolledAt." }),
  department: DepartmentSchema,
});

export type StudentProfileData = z.infer<typeof StudentProfileSchema>;
