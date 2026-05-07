import { Suspense } from "react";
import ResetPasswordConfirmPage from "@/components/auth/reset-password/ResetPasswordConfirmPage";

function ResetPasswordConfirmLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
