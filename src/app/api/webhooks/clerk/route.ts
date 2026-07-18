// src/app/api/webhooks/clerk/route.ts
import { NextResponse, NextRequest } from "next/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import prisma from "@/lib/prisma"; // Assumed path to your Prisma client
import { headers } from "next/headers";
import logger from "@/lib/logger";

// The secret is necessary to verify the request is genuinely from Clerk
const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

/**
 * Handles incoming POST requests from Clerk webhooks.
 * This route is public and must be protected by Svix signature verification.
 */
export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    logger.error("WEBHOOK_SECRET is not configured. Webhooks are insecure.");
    return NextResponse.json(
      { error: "Internal Server Error: Missing Webhook Secret" },
      { status: 500 }
    );
  }

  // 1. Extract necessary headers for Svix verification
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    logger.warn("Webhook Error: Missing required Svix headers.");
    return NextResponse.json(
      { error: "Missing Svix headers" },
      { status: 400 }
    );
  }

  // 2. Get the raw body text for signature verification
  const payload = await req.text();

  // 3. Verify the signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, "Webhook Error: Signature verification failed.");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 4. Process the verified event
  const { id } = evt.data;
  const eventType = evt.type;

  logger.info({ eventType, id }, "Received Clerk Webhook event");

  if (eventType === "user.created") {
    // A new user has signed up. Create the record in Postgres.
    const email = evt.data.email_addresses[0].email_address;
    // Concatenate names or fall back to an empty string
    const name = `${evt.data.first_name || ""} ${
      evt.data.last_name || ""
    }`.trim();
    // Default new users to STUDENT role since STAFF doesn't exist
    const rawRole = (evt.data.public_metadata.role as string | undefined) || "STUDENT";
    const role = (rawRole.toUpperCase() === "ADMIN" ? "ADMIN" : "STUDENT") as "ADMIN" | "STUDENT";

    try {
      if (role === "ADMIN") {
        const [dbUser] = await prisma.$transaction([
          prisma.user.upsert({
            where: { id: id! },
            create: {
              id: id!,
              email: email,
              role: "ADMIN",
            },
            update: {
              email: email,
              role: "ADMIN",
            },
          }),
          prisma.admin.upsert({
            where: { userId: id! },
            create: {
              userId: id!,
              name: name || email,
            },
            update: {
              name: name || email,
            },
          }),
        ]);
        logger.info({ id }, "Admin user created/updated in Postgres from Webhook");
      } else {
        // For STUDENT, we only create the base User record.
        // Their Student profile is created during the onboarding process when they select a department.
        const dbUser = await prisma.user.upsert({
          where: { id: id! },
          create: {
            id: id!,
            email: email,
            role: "STUDENT",
          },
          update: {
            email: email,
            role: "STUDENT",
          },
        });
        logger.info({ id }, "Student user created/updated in Postgres from Webhook");
      }
      return new Response("User Created", { status: 201 });
    } catch (dbError) {
      logger.error(
        { 
          id, 
          err: dbError instanceof Error ? dbError.message : dbError,
          stack: dbError instanceof Error ? dbError.stack : undefined
        },
        "Failed to create user in Postgres from Webhook"
      );
      return NextResponse.json(
        { error: "Database creation failed" },
        { status: 500 }
      );
    }
  } else if (eventType === "user.updated") {
    // A user's details (or role via Admin dashboard) have changed.
    const email = evt.data.email_addresses[0]?.email_address;
    const name = `${evt.data.first_name || ""} ${
      evt.data.last_name || ""
    }`.trim();
    const rawRole = evt.data.public_metadata.role as string | undefined;
    const role = rawRole ? ((rawRole.toUpperCase() === "ADMIN" ? "ADMIN" : "STUDENT") as "ADMIN" | "STUDENT") : undefined;

    if (!id)
      return NextResponse.json(
        { error: "Missing ID for update" },
        { status: 400 }
      );

    try {
      await prisma.$transaction(async (tx) => {
        // Update the base User details
        await tx.user.update({
          where: { id: id },
          data: {
            ...(email && { email }),
            ...(role && { role }),
          },
        });

        // Update name in profile tables if provided
        if (name) {
          await tx.admin.updateMany({
            where: { userId: id },
            data: { name },
          });
          await tx.student.updateMany({
            where: { userId: id },
            data: { name },
          });
        }
      });

      logger.info({ id }, "User updated in Postgres from Webhook");
      return new Response("User Updated", { status: 200 });
    } catch (dbError) {
      logger.error(
        { 
          id, 
          err: dbError instanceof Error ? dbError.message : dbError,
          stack: dbError instanceof Error ? dbError.stack : undefined 
        },
        "Failed to update user in Postgres from Webhook"
      );
      return NextResponse.json(
        { error: "Database update failed" },
        { status: 500 }
      );
    }
  } else if (eventType === "user.deleted") {
    // User deleted their account or was deleted by an Admin.
    if (!id)
      return NextResponse.json(
        { error: "Missing ID for deletion" },
        { status: 400 }
      );

    try {
      // Cascade delete: delete related profiles first, then User
      await prisma.$transaction([
        prisma.admin.deleteMany({ where: { userId: id } }),
        prisma.student.deleteMany({ where: { userId: id } }),
        prisma.user.deleteMany({ where: { id: id } }),
      ]);

      logger.info({ id }, "User and related data deleted from Postgres from Webhook");
      return new Response("User Deleted", { status: 200 });
    } catch (dbError) {
      logger.warn(
        { 
          id, 
          err: dbError instanceof Error ? dbError.message : dbError,
          stack: dbError instanceof Error ? dbError.stack : undefined 
        },
        "Failed to fully delete user (record might not exist)"
      );
      return new Response("User Deletion Acknowledged", { status: 202 });
    }
  }

  // For any other event type we don't handle, return 200/OK so Clerk doesn't retry
  return NextResponse.json(
    { message: `Event type ${eventType} acknowledged` },
    { status: 200 }
  );
}

// Next.js config to prevent the default body parser, necessary for Svix verification.
export const config = {
  runtime: "nodejs",
};
