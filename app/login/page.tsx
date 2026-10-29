import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main>
      <h1>Log in</h1>
      <p className="sub">Welcome back.</p>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
