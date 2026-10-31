import Link from "next/link";
import { PasswordForm, SettingsForm } from "@/components/SettingsForm";
import { requireProfile } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile } = await requireProfile();
  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1>Settings</h1>
        <form action="/auth/signout" method="post">
          <button type="submit" className="alt small">Log out</button>
        </form>
      </div>
      <p className="sub">{profile.email}</p>
      <SettingsForm profile={profile} />
      <div className="card">
        <h2>Plan</h2>
        <p className="muted" style={{ margin: "0 0 10px" }}>See usage, upgrade, update your card, or cancel your subscription.</p>
        <Link className="btn alt" href="/billing">Billing &amp; cancel subscription</Link>
      </div>
      <PasswordForm />
      <form action="/auth/signout" method="post">
        <button type="submit" className="alt" style={{ width: "100%" }}>Log out</button>
      </form>
    </main>
  );
}
