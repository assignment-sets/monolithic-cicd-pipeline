// app/api/v1/departments/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth"; // Using the generic requireAuth middleware
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";

// GET /api/v1/departments → Fetches all departments (Requires any authenticated user)
export const GET = requireAuth(async () => {
  try {
    // Fetch all departments
    let departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    // Auto-seed default departments if none exist
    if (departments.length === 0) {
      await prisma.department.createMany({
        data: [
          { name: "Computer Science" },
          { name: "Electrical Engineering" },
          { name: "Information Technology" },
          { name: "Mechanical Engineering" },
        ],
      });
      
      // Refetch
      departments = await prisma.department.findMany({
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
      });
    }

    logger.info({ count: departments.length }, "Successfully returned departments");
    return NextResponse.json({ departments });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : error }, "Database error when listing departments");
    return NextResponse.json(
      { error: "Internal server error while fetching departments." },
      { status: 500 }
    );
  }
});
