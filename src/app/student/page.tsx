// app/student/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { StudentProfileData } from "@/schemas/student";
import { getStudentProfileMe } from "@/app/services/studentServices";
import StudentProfileDisplay from "@/components/Student/StudentProfileDisplay"; // Assuming you update paths

/**
 * The client component for the dedicated student profile page (/student/me).
 * This handles the fetching logic and state management.
 */
const StudentMePage: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        // Calling the service layer function
        const data = await getStudentProfileMe();
        setProfile(data);
      } catch (err) {
        // Error handling is centralized in the service layer, we just display it here
        const errorMessage =
          (err as Error).message || "Failed to fetch profile.";
        setError(errorMessage);
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []); // Runs once on mount

  // --- Rendering States (UI components) ---

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-xl shadow-lg border border-gray-100 min-h-screen">
        <Loader2 className="animate-spin mr-3 h-5 w-5 text-indigo-500" />
        <span className="text-gray-600">Loading student profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md max-w-2xl mx-auto mt-10">
        <p className="font-bold">Error Accessing Profile:</p>
        <p>{error}</p>
        <p className="text-sm mt-1">
          Please verify your connection and permissions.
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 rounded-md max-w-2xl mx-auto mt-10">
        No profile data received.
      </div>
    );
  }

  // --- Success Render: Pass data to the pure display component ---
  return <StudentProfileDisplay profile={profile} />;
};

export default StudentMePage;
