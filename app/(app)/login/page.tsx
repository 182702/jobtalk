import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { translator } from "@/lib/ui";
import { getUiLang } from "@/lib/ui-server";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  const lang = await getUiLang();
  const T = translator(lang);
  return (
    <main>
      <h1>{T("Log in")}</h1>
      <p className="sub">{T("Welcome back.")}</p>
      <Suspense>
        <AuthForm mode="login" lang={lang} />
      </Suspense>
    </main>
  );
}
