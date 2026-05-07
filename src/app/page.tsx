import { redirect } from "next/navigation";

import { routing } from "@/i18n/routing";

export default function RootPage() {
  // Redirect bare root to the default locale.
  redirect(`/${routing.defaultLocale}`);
}
