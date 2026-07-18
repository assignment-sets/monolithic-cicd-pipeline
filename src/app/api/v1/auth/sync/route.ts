// src/app/api/v1/auth/sync/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { clerkClient } from "@/lib/clerk";
import logger from "@/lib/logger";

export async function POST() {
  try {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = clerkUser.id;
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || email;

    // Check if the user exists and has their profile in the database
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        adminProfile: true,
        studentProfile: true,
      },
    });

    const metadataRole = clerkUser.publicMetadata?.role as string | undefined;

    // Verify if matching profile exists
    const hasProfile = dbUser && (
      (dbUser.role === "ADMIN" && dbUser.adminProfile) ||
      (dbUser.role === "STUDENT" && dbUser.studentProfile)
    );

    if (!dbUser || !hasProfile) {
      // User is in Clerk but missing from DB or lacks profile (e.g. webhook defaulted to STUDENT but has no profile yet)
      // Check if we can auto-recreate the profile (Admins can be recreated immediately, Students need onboarding for department)
      if (metadataRole === "ADMIN") {
        await prisma.$transaction([
          prisma.user.upsert({
            where: { id: userId },
            create: { id: userId, email: email, role: "ADMIN" },
            update: { role: "ADMIN" },
          }),
          prisma.admin.upsert({
            where: { userId: userId },
            create: { userId: userId, name: name },
            update: { name: name },
          }),
        ]);
        logger.info({ userId }, "Recreated Admin user in Postgres");
        return NextResponse.json({ synced: true, role: "ADMIN" });
      }

      // If they are a STUDENT, they must go through onboarding to select their department
      return NextResponse.json({ synced: false, reason: "needs_onboarding" });
    }

    // User is fully set up. Ensure Clerk public metadata is in sync.
    if (!metadataRole || metadataRole !== dbUser.role) {
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          role: dbUser.role,
        },
      });
      logger.info({ userId, role: dbUser.role }, "Synced Clerk publicMetadata role");
    }

    return NextResponse.json({ synced: true, role: dbUser.role });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : error }, "Error syncing user");
    return NextResponse.json(
      { error: "Internal server error during sync." },
      { status: 500 }
    );
  }
}
