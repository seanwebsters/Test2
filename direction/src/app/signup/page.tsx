import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Create account" };

export default function SignUp() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
