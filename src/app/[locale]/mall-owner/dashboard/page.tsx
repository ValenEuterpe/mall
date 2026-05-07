export const dynamic = "force-dynamic";

import { Suspense } from "react";
import MallOwnerDashboardClient from "./MallOwnerDashboardClient";

function LoadingFallback(): React.ReactElement {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
    </div>
  );
}

export default function Page(): React.ReactElement {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MallOwnerDashboardClient />
    </Suspense>
  );
}
