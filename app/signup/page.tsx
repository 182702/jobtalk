import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { translator } from "@/lib/ui";
import { getUiLang } from "@/lib/ui-server";

export const metadata = { title: "Sign up" };

export default async function SignupPage() {
  const lang = await getUiLang();
  const T = translator(lang);
  return (
    <main>
      <h1>{T("Create your account")}</h1>
      <p className="sub">{T("Free for 5 job notes a month. No card needed.")}</p>
      <Suspense>
        <AuthForm mode="signup" lang={lang} />
      </Suspense>
      <p className="muted small">
        {T("By signing up you agree to the")} <a href="/terms">{T("terms")}</a> {T("and")} <a href="/privacy">{T("privacy policy")}</a>.
      </p>
    </main>
  );
}
