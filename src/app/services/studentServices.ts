// app/services/studentServices.ts
import { StudentProfileData, StudentProfileSchema } from "@/schemas/student";
import { z } from "zod";

/**
 * Fetches the currently logged-in student's profile from the backend API.
 * This function handles the fetch, error checking, and Zod validation.
 * @returns A promise that resolves to the validated StudentProfileData.
 * @throws An error if the network request fails or the data validation fails.
 */
export const getStudentProfileMe = async (): Promise<StudentProfileData> => {
  try {
    // 1. Fetch data from the internal API route
    const response = await fetch("/api/v1/student/me", {
      method: "GET",
      // Ensure data is fresh when this service is called
      cache: "no-store",
    });

    // 2. Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error ||
          `HTTP Error ${response.status}: Failed to fetch student profile.`
      );
    }

    // 3. Parse JSON response
    const rawData = await response.json();

    // Check if the response structure includes the 'me' key as expected
    if (!rawData || !rawData.me) {
      throw new Error(
        "API response structure is incorrect (missing 'me' object)."
      );
    }

    // 4. Validate the profile data using Zod
    const validatedData = StudentProfileSchema.parse(rawData.me);

    return validatedData;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle Zod validation errors gracefully
      console.error("Data Validation Error:", error.issues);
      throw new Error("Received invalid data structure from the server.");
    }
    // Re-throw other errors (network, HTTP, etc.)
    throw error;
  }
};