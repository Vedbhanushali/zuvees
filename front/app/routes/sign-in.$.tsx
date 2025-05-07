import { SignIn } from "@clerk/remix";

export default function SignInLayout() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignIn />
      </div>
    </div>
  );
}
