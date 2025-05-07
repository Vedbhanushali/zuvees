import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

import { createClerkClient } from "@clerk/remix/api.server";
import { getAuth } from "@clerk/remix/ssr.server";
import { getOrCreateDbUser } from "~/server/auth.server";
import { Role } from "@prisma/client";

export async function loader(args: LoaderFunctionArgs) {
  // if not login go to sign in page
  // get/create user (will create if email is in ApprovedEmail list)
  // user is valid based on type will be redirected to the correct page

  const { userId, sessionId } = await getAuth(args);
  if (!userId || !sessionId) {
    // This should not happen if Clerk redirects correctly after login,
    // but as a fallback, send to sign-in.
    console.warn("Auth callback reached without active session/userId.");
    return redirect("/sign-in");
  }
  // Fetch full Clerk user object to get email etc.
  const clerkUser = await createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  }).users.getUser(userId);

  if (!clerkUser) {
    console.error(`Clerk user not found for ID: ${userId}`);
    return redirect("/sign-in");
  }
  const dbUser = await getOrCreateDbUser(clerkUser);
  if (!dbUser) {
    // User's email might not be in ApprovedEmail list, or DB creation failed.
    console.warn(
      `DB User could not be fetched or created for Clerk ID: ${userId}. Redirecting to home.`
    );
    return redirect("/unauthorized-access");
  }

  if (dbUser.role === Role.ADMIN) {
    return redirect("/admin/dashboard");
  } else if (dbUser.role === Role.CUSTOMER) {
    return redirect("/products");
  } else {
    // Fallback for other roles or if role is not set as expected
    console.warn(
      `User ${dbUser.email} has role ${dbUser.role}, redirecting to products.`
    );
    return redirect("/products");
  }
}

export default function AuthCallback() {
  return <div>Loading your experience...</div>;
}
