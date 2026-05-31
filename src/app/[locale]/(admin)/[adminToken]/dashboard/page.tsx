import { getTranslations } from "next-intl/server";

export default async function AdminDashboardPage(): Promise<React.ReactElement> {
  const t = await getTranslations("adminPanel");

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("pages.dashboard.title")}
      </h1>
      <p className="text-muted-foreground text-sm">
        {t("pages.dashboard.subtitle")}
      </p>

      <div className="rounded-md border p-4 text-sm">
        <div className="font-medium">{t("pages.dashboard.nextStepTitle")}</div>
        <div>{t("pages.dashboard.nextStepBody", { locale: "{locale}" })}</div>
      </div>
    </div>
  );
}
