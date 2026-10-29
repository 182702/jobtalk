import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <main>
      <h1>Create your account</h1>
      <p className="sub">Free for 5 job notes a month. No card needed.</p>
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
      <p className="muted small">
        By signing up you agree to the <a href="/terms">terms</a> and <a href="/privacy">privacy policy</a>.
      </p>
    </main>
  );
}
