// src/middleware/role.ts

import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { AppRouteHandler } from "./auth";

export function requireRole<Params = any>(
  allowedRoles: string[],
  handler: AppRouteHandler<Params>
): AppRouteHandler<Params> {
  return async (req, ctx) => {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.publicMetadata?.role as string | undefined;
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    return handler(req, ctx);
  };
}
