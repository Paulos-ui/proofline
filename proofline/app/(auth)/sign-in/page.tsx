import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/marketing/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="sign-in" />
    </Suspense>
  );
}
