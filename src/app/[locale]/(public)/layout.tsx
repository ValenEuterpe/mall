"use client";

import { Suspense, type ReactNode } from "react";

import { SidebarToggleProvider } from "@/contexts/sidebar-toggle-context";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function PublicLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SidebarToggleProvider>
      <div className="flex min-h-screen flex-col">
        <Suspense>
          <Header />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </SidebarToggleProvider>
  );
}
