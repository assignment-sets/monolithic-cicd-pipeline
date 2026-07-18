// src/app/api/v1/student/me/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { requireRole } from "@/middleware/role";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";

// GET /api/v1/student/me → Student fetches their own detailed profile
export const GET = requireRole(["STUDENT"], async () => {
  const clerkUser = await currentUser();

  // This check is theoretically redundant due to requireRole, but provides type safety and immediate feedback
  if (!clerkUser) {
    logger.warn("Auth middleware failed to block unauthenticated access");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = clerkUser.id;

  try {
    // Fetch the Student profile and include the associated Department
    const studentProfile = await prisma.student.findUnique({
      where: { userId: userId },
      select: {
        name: true,
        enrolledAt: true,
        department: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    if (!studentProfile) {
      logger.error({ userId }, "User is authenticated as STUDENT but profile is missing");
      return NextResponse.json(
        { error: "Student profile not found in database." },
        { status: 404 }
      );
    }

    // Combine Clerk details and DB details for a complete 'me' response
    const me = {
      clerkId: userId,
      email: clerkUser.emailAddresses[0].emailAddress,
      role: clerkUser.publicMetadata.role,
      ...studentProfile,
    };

    logger.info({ userId }, "Profile fetched successfully");
    return NextResponse.json({ me });
  } catch (error) {
    logger.error({ userId, err: error instanceof Error ? error.message : error }, "Database error when fetching user profile");
    return NextResponse.json(
      { error: "Internal server error during profile fetch." },
      { status: 500 }
    );
  }
});
