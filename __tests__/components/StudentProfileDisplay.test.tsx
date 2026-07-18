// __tests__/components/StudentProfileDisplay.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import StudentProfileDisplay from "@/components/Student/StudentProfileDisplay";
import { StudentProfileData } from "@/schemas/student";

describe("StudentProfileDisplay Component", () => {
  const mockProfile: StudentProfileData = {
    clerkId: "user_test123",
    email: "alice@example.com",
    role: "STUDENT",
    name: "Alice Johnson",
    enrolledAt: "2026-07-14T12:00:00.000Z",
    department: {
      id: "dept_1",
      name: "Computer Science",
    },
  };

  it("renders student profile details correctly", () => {
    render(<StudentProfileDisplay profile={mockProfile} />);

    // Check title
    expect(screen.getByText("Student Profile 🎓")).toBeInTheDocument();

    // Check name and email
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();

    // Check department
    expect(screen.getByText("Computer Science")).toBeInTheDocument();

    // Check role badge
    expect(screen.getByText("STUDENT")).toBeInTheDocument();

    // Check Clerk ID footer
    expect(screen.getByText(/user_test123/)).toBeInTheDocument();
  });
});
