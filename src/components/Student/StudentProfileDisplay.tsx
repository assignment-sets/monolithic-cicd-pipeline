// components/Student/StudentProfileDisplay.tsx
import React from "react";
import { StudentProfileData } from "@/schemas/student";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface StudentProfileDisplayProps {
  profile: StudentProfileData;
}

/**
 * A purely presentational component for displaying the student's profile information,
 * utilizing shadcn/ui components.
 */
const StudentProfileDisplay: React.FC<StudentProfileDisplayProps> = ({
  profile,
}) => {
  // Format the enrollment date
  const enrolledDate = new Date(profile.enrolledAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <Card className="max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-3xl font-bold text-indigo-700">
            Student Profile 🎓
          </CardTitle>
          <Badge 
            variant="default" 
            className="bg-indigo-600 hover:bg-indigo-700 text-xs px-3 py-1 uppercase tracking-wider"
          >
            {profile.role}
          </Badge>
        </div>
        <Separator className="mt-3" />
      </CardHeader>
      
      <CardContent className="space-y-6 text-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name and Contact Card */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm">
                <p className="font-semibold text-gray-800">Full Name:</p>
                <p className="ml-0 font-medium">{profile.name}</p>
              </div>
              <div className="text-sm">
                <p className="font-semibold text-gray-800">Email:</p>
                <p className="ml-0 truncate">{profile.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Enrollment and Department Card */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm">
                <p className="font-semibold text-gray-800">Enrolled Since:</p>
                <p className="ml-0">{enrolledDate}</p>
              </div>
              <div className="text-sm">
                <p className="font-semibold text-gray-800">Department:</p>
                <p className="ml-0 font-bold text-pink-600">
                  {profile.department.name}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>

      <div className="p-4 text-center text-xs text-gray-400 border-t bg-gray-50 rounded-b-xl">
        Clerk ID: {profile.clerkId}
      </div>
    </Card>
  );
};

export default StudentProfileDisplay;
