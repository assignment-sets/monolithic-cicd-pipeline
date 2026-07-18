// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import logger from "@/lib/logger";

// Define which routes are completely public / webhooks
const isPublicRoute = createRouteMatcher([
  "/api/webhooks/clerk(.*)", 
  "/api/v1/webhooks/clerk(.*)" // Catching both variations just in case
]);

export default clerkMiddleware(async (auth, request) => {
  logger.info({ url: request.url, method: request.method }, "Incoming request in middleware");
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};