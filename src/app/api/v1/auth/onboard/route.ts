// src/app/api/v1/auth/onboard/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { clerkClient } from "@/lib/clerk";
import logger from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = clerkUser.id;
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    const body = await req.json();
    const { role, name, departmentId } = body;

    if (!role || !name || (role !== "ADMIN" && role !== "STUDENT")) {
      return NextResponse.json(
        { error: "Invalid role or missing name/role parameters." },
        { status: 400 }
      );
    }

    if (role === "STUDENT" && !departmentId) {
      return NextResponse.json(
        { error: "Department ID is required for students." },
        { status: 400 }
      );
    }

    // Check if the user already has their profile in Postgres
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        adminProfile: true,
        studentProfile: true,
      },
    });

    const hasProfile = existingUser && (
      (existingUser.role === "ADMIN" && existingUser.adminProfile) ||
      (existingUser.role === "STUDENT" && existingUser.studentProfile)
    );

    if (hasProfile) {
      return NextResponse.json(
        { error: "User is already fully registered and onboarded." },
        { status: 400 }
      );
    }

    if (role === "ADMIN") {
      // Upsert the base User and Admin profile
      await prisma.$transaction([
        prisma.user.upsert({
          where: { id: userId },
          create: {
            id: userId,
            email: email,
            role: "ADMIN",
          },
          update: {
            role: "ADMIN",
          },
        }),
        prisma.admin.upsert({
          where: { userId: userId },
          create: {
            userId: userId,
            name: name,
          },
          update: {
            name: name,
          },
        }),
      ]);
    } else {
      // Validate department exists
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        return NextResponse.json(
          { error: "Selected department does not exist." },
          { status: 400 }
        );
      }

      // Upsert the base User and Student profile
      await prisma.$transaction([
        prisma.user.upsert({
          where: { id: userId },
          create: {
            id: userId,
            email: email,
            role: "STUDENT",
          },
          update: {
            role: "STUDENT",
          },
        }),
        prisma.student.upsert({
          where: { userId: userId },
          create: {
            userId: userId,
            name: name,
            departmentId: departmentId,
          },
          update: {
            name: name,
            departmentId: departmentId,
          },
        }),
      ]);
    }

    // Split name into first and last name to update Clerk
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Update Clerk public metadata and user profile details (firstName and lastName)
    await Promise.all([
      clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          role: role,
        },
      }),
      clerkClient.users.updateUser(userId, {
        firstName,
        lastName,
      }),
    ]);

    logger.info({ userId, role }, "Onboard success");
    return NextResponse.json({ success: true, role });
  } catch (error) {
    logger.error(
      { 
        err: error instanceof Error ? error.message : error, 
        stack: error instanceof Error ? error.stack : undefined 
      }, 
      "Error onboarding user"
    );
    return NextResponse.json(
      { error: "Internal server error during onboarding." },
      { status: 500 }
    );
  }
}
