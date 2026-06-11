import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define the routes that are accessible without logging in
const isPublicRoute = createRouteMatcher(["/", "/login", "/sso-callback"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.[\\w]+$|_next).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
