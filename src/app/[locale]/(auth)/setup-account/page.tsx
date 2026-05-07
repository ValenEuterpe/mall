import { Suspense } from "react";
import SetupAccountPage from "@/components/auth/setup-account/SetupAccountPage";
import { Card, CardContent } from "@/components/ui/card";

function LoadingFallback(): React.ReactElement {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page(): React.ReactElement {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SetupAccountPage />
    </Suspense>
  );
}
