import { SignedIn, SignIn, UserButton } from "@clerk/remix";
import { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [{ title: "Sign In" }];
};

export default function SignInLayout() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignIn />
        <SignedIn>
          <p>You are already signed in.</p>
          <UserButton />
        </SignedIn>
      </div>
    </div>
  );
}
