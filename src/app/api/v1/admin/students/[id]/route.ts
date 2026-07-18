// src/app/api/v1/admin/students/[id]/route.ts
import { NextResponse } from "next/server";
import { requireRole } from "@/middleware/role";
import prisma from "@/lib/prisma";
import { clerkClient } from "@/lib/clerk";
import logger from "@/lib/logger";

type Params = { id: string };

// GET /api/v1/admin/students/:id → Admin fetches a single Student profile
export const GET = requireRole(
  ["ADMIN"],
  async (_req, { params }: { params: Promise<Params> }) => {
    const { id: userId } = await params;

    try {
      const student = await prisma.student.findUnique({
        where: { userId: userId },
        include: {
          user: { select: { email: true, role: true, createdAt: true } },
          department: { select: { name: true, id: true } },
        },
      });

      if (!student) {
        logger.warn({ userId }, "Student profile not found");
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 }
        );
      }

      logger.info({ userId }, "Fetched student profile");
      return NextResponse.json({ student });
    } catch (error) {
      logger.error(
        { userId, err: error instanceof Error ? error.message : error },
        "Database error when fetching student profile"
      );
      return NextResponse.json(
        { error: "Internal server error." },
        { status: 500 }
      );
    }
  }
);

// PUT /api/v1/admin/students/:id → Admin updates a Student profile
export const PUT = requireRole(
  ["ADMIN"],
  async (req, { params }: { params: Promise<Params> }) => {
    const { id: userId } = await params;
    const body = await req.json();
    const { name, departmentId } = body;

    try {
      // 1. Update Student profile details
      const studentProfile = await prisma.student.update({
        where: { userId: userId },
        data: {
          ...(name && { name }),
          ...(departmentId && { departmentId }),
        },
      });

      // 2. Optional: Update name in Clerk if needed (using Clerk API for robust sync)
      if (name) {
        const [firstName, lastName] = name.split(" ");
        await clerkClient.users.updateUser(userId, {
          firstName,
          lastName,
        });
        logger.info({ userId }, "Clerk user name updated");
      }

      logger.info({ userId }, "Student profile updated");
      return NextResponse.json({ studentProfile });
    } catch (error) {
      logger.error(
        { userId, err: error instanceof Error ? error.message : error },
        "Error updating student"
      );
      return NextResponse.json(
        { error: "Failed to update student profile." },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/v1/admin/students/:id → Admin deletes a Student
export const DELETE = requireRole(
  ["ADMIN"],
  async (_req, { params }: { params: Promise<Params> }) => {
    const { id: userId } = await params;

    try {
      // 1. Start a transaction to ensure all related DB records are deleted
      await prisma.$transaction([
        // Delete the Student profile (which implicitly handles the 1:1 relation cleanup)
        prisma.student.delete({ where: { userId: userId } }),
        // Delete the base User identity record
        prisma.user.delete({ where: { id: userId } }),
      ]);

      // 2. Delete the user from Clerk (REQUIRED for security and access control)
      await clerkClient.users.deleteUser(userId);

      logger.info({ userId }, "Successfully deleted user from Clerk and Postgres");
      return NextResponse.json({
        message: "Student and associated user deleted successfully.",
      });
    } catch (error) {
      logger.error(
        { userId, err: error instanceof Error ? error.message : error },
        "Error deleting student"
      );
      return NextResponse.json(
        { error: "Failed to delete student user." },
        { status: 500 }
      );
    }
  }
);
