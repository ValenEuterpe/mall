import { Suspense } from "react";
import ResetPasswordConfirmPage from "@/components/auth/reset-password/ResetPasswordConfirmPage";

function ResetPasswordConfirmLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ResetPasswordConfirmLoading />}>
      <ResetPasswordConfirmPage />
    </Suspense>
  );
}
