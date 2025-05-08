import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";

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
  return redirect("/auth/callback");
}

export default function AuthCallback() {
  return <div>Loading your experience...</div>;
}
