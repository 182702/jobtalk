import { StartGuide } from "@/components/StartGuide";
import { requireProfile } from "@/lib/auth";
import { getUiLang } from "@/lib/ui-server";

export const metadata = { title: "Get started" };

export default async function StartPage() {
  const { profile } = await requireProfile();
  const lang = await getUiLang();
  return (
    <main>
      <StartGuide profile={profile} lang={lang} />
    </main>
  );
}
