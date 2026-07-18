// src/app/api/v1/admin/students/route.ts
import { NextResponse } from "next/server";
import { requireRole } from "@/middleware/role";
import prisma from "@/lib/prisma";
import { clerkClient } from "@/lib/clerk";
import { Prisma } from "@prisma/client";
import type { User as ClerkUser } from "@clerk/backend";
import logger from "@/lib/logger";

// POST /api/v1/admin/students → Admin creates a new Student
export const POST = requireRole(["ADMIN"], async (req) => {
  const body = await req.json();
  const { email, password, name, departmentId } = body;

  if (!email || !password || !name || !departmentId) {
    logger.warn({ email, name, departmentId }, "Missing required fields in create student request");
    return NextResponse.json(
      { error: "Missing required fields: email, password, name, departmentId" },
      { status: 400 }
    );
  }

  let clerkUser: ClerkUser | undefined = undefined;
  try {
    // Generate a clean, unique username from email
    const cleanEmailPrefix = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedUsername = `${cleanEmailPrefix}_${randomSuffix}`;

    // Split name into first and last name
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // 1. Create Clerk user with required username, names, and metadata (role)
    clerkUser = await clerkClient.users.createUser({
      emailAddress: [email],
      username: generatedUsername,
      firstName,
      lastName,
      password,
      publicMetadata: { role: "STUDENT" },
    });
    logger.info({ clerkUserId: clerkUser.id, username: generatedUsername }, "Clerk user created");

    const userId = clerkUser.id;

    // 2. Use a transaction to create records in both User and Student tables
    const [dbUser, studentProfile] = await prisma.$transaction([
      // Create the base User identity record
      prisma.user.create({
        data: {
          id: userId,
          email: email,
          role: "STUDENT",
        },
      }),
      // Create the 1:1 Student profile record
      prisma.student.create({
        data: {
          userId: userId,
          name: name,
          departmentId: departmentId,
        },
      }),
    ]);

    logger.info({ userId }, "Student successfully synced to Postgres");

    return NextResponse.json(
      {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
        },
        studentProfile,
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error({ err: error instanceof Error ? error.message : error }, "Error creating student");

    // Attempt to clean up the Clerk user if the DB transaction fails
    if (clerkUser) {
      const clerkUserId = clerkUser.id;
      await clerkClient.users.deleteUser(clerkUserId).catch((e) => {
        logger.error(
          { clerkUserId, err: e instanceof Error ? e.message : e },
          "CRITICAL: Failed to clean up Clerk user"
        );
      });
    }

    // Check for Clerk API response errors and return detailed messages
    if (error && typeof error === "object" && "errors" in error) {
      const clerkErrors = error.errors;
      logger.error({ clerkErrors }, "Clerk API Error details");
      const message = clerkErrors.map((e: any) => e.longMessage || e.message).join(", ");
      return NextResponse.json({ error: `Clerk Error: ${message}` }, { status: 422 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Email already exists." },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error during student creation." },
      { status: 500 }
    );
  }
});

// GET /api/v1/admin/students → Admin lists all Students
export const GET = requireRole(["ADMIN"], async () => {
  try {
    // Fetch all Student profiles, including their base User info and Department
    const students = await prisma.student.findMany({
      select: {
        userId: true,
        name: true,
        enrolledAt: true,
        department: { select: { name: true } },
        user: { select: { email: true, role: true, createdAt: true } },
      },
      orderBy: { enrolledAt: "asc" },
    });

    logger.info({ count: students.length }, "Successfully returned student records");
    return NextResponse.json({ students });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : error }, "Database error when listing students");
    return NextResponse.json(
      { error: "Internal server error while fetching student list." },
      { status: 500 }
    );
  }
});
