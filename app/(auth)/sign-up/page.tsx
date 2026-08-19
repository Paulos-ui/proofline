import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/marketing/AuthForm";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="sign-up" />
    </Suspense>
  );
}
