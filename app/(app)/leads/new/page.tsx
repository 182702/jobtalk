import Link from "next/link";
import { LeadForm } from "@/components/LeadForm";
import { requireProfile } from "@/lib/auth";
import { translator } from "@/lib/ui";
import { getUiLang } from "@/lib/ui-server";

export const metadata = { title: "Add lead" };

export default async function NewLeadPage() {
  await requireProfile();
  const lang = await getUiLang();
  const T = translator(lang);
  return (
    <main>
      <p className="small" style={{ margin: "0 0 6px" }}>
        <Link href="/leads">← {T("Leads")}</Link>
      </p>
      <h1>{T("Add lead")}</h1>
      <p className="sub">{T("Only the name is needed. You can add the rest later.")}</p>
      <LeadForm uiLang={lang} />
    </main>
  );
}
