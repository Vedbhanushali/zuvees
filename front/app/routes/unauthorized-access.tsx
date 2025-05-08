import { getAuth } from "@clerk/remix/ssr.server";
import { Card, CardBody, CardFooter, CardHeader, Form } from "@heroui/react";
import { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/react";
import { createClerkClient } from "@clerk/remix/api.server";

export async function action(args: ActionFunctionArgs) {
  // logout and move to sign in page
  const { sessionId } = await getAuth(args);
  if (sessionId)
    await createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    }).sessions.revokeSession(sessionId);
  return redirect("/sign-in");
}

export default function UnAuth() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="max-w-[400px]">
          <CardHeader className="flex gap-3">
            <div className="flex flex-col">
              <p className="text-md">Unauthorized Access</p>
            </div>
          </CardHeader>
          <CardBody>
            <p>Please contact Administrator.</p>
          </CardBody>
          <CardFooter>
            <Form method="post">
              <button type="submit">
                Logout & SignUp with Different Account
              </button>
            </Form>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
