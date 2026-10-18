import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Sign in" };

export default function SignIn() {
  return (
    <Suspense>
      <AuthForm mode="signin" />
    </Suspense>
  );
}
