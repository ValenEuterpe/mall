import { getTranslations } from "next-intl/server";

export default async function AdminUsersPage(): Promise<React.ReactElement> {
  const t = await getTranslations("adminPanel");

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">{t("pages.users.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("pages.users.comingSoon")}</p>
    </div>
  );
}
