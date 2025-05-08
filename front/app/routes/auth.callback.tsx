// app/routes/auth.callback.tsx
import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { createClerkClient } from "@clerk/remix/api.server"; // Recommended for server-to-server
import { getAuth } from "@clerk/remix/ssr.server";
import { getOrCreateDbUser } from "~/server/auth.server"; // Ensure this path is correct for your project
import { Role } from "@prisma/client"; // Ensure this path is correct

export async function loader(args: LoaderFunctionArgs) {
  // Changed args to request
  console.log("AUTH_CALLBACK_LOADER: Entered");
  console.log(
    "AUTH_CALLBACK_LOADER: CLERK_SECRET_KEY is set:",
    !!process.env.CLERK_SECRET_KEY
  );

  const { userId, sessionId } = await getAuth(args); // Changed args to request
  console.log(
    `AUTH_CALLBACK_LOADER: userId: ${userId}, sessionId: ${sessionId}`
  );

  if (!userId || !sessionId) {
    console.warn(
      "AUTH_CALLBACK_LOADER: No userId or sessionId found. Redirecting to /sign-in."
    );
    // This can happen if cookies aren't set correctly or if rootAuthLoader hasn't processed session yet.
    return redirect("/sign-in");
  }

  const clerkUser = await createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  }).users.getUser(userId);
  console.log("AUTH_CALLBACK_LOADER: Fetched clerkUser:", !!clerkUser);

  if (!clerkUser) {
    console.error(
      `AUTH_CALLBACK_LOADER: Clerk user not found for ID: ${userId}. Redirecting to /sign-in.`
    );
    // This would be very unusual if userId was present from getAuth
    return redirect("/sign-in");
  }

  const dbUser = await getOrCreateDbUser(clerkUser);
  console.log(
    "AUTH_CALLBACK_LOADER: Fetched dbUser:",
    dbUser ? { id: dbUser.id, email: dbUser.email, role: dbUser.role } : null
  );

  if (!dbUser) {
    console.warn(
      `AUTH_CALLBACK_LOADER: DB User could not be fetched or created for Clerk ID: ${userId} (Email: ${
        clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId
        )?.emailAddress
      }). Redirecting to /unauthorized-access.`
    );
    // This is a critical point - check your getOrCreateDbUser logic and ApprovedEmail list.
    return redirect("/unauthorized-access"); // Ensure this route exists and is informative.
  }

  console.log(
    `AUTH_CALLBACK_LOADER: DB User role: ${dbUser.role}. Redirecting.`
  );
  if (dbUser.role === Role.ADMIN) {
    return redirect("/admin"); // Be specific, e.g., /admin/dashboard
  } else if (dbUser.role === Role.CUSTOMER) {
    return redirect("/products");
  } else {
    console.warn(
      `AUTH_CALLBACK_LOADER: User ${dbUser.email} has unhandled role ${dbUser.role}. Defaulting to /products.`
    );
    return redirect("/products");
  }
}

export default function AuthCallback() {
  // This page usually just shows a loading spinner or message,
  // as the loader should always redirect.
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2em" }}>Loading your session...</h1>
      <p>Please wait while we redirect you.</p>
    </div>
  );
}
