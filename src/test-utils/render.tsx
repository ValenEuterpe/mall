import React, { type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";

interface CustomRenderOptions extends RenderOptions {
  wrapper?: React.ComponentType<{ children: ReactNode }>;
}

export function customRender(
  ui: React.ReactElement,
  options?: CustomRenderOptions
) {
  function AllProviders({ children }: { children: ReactNode }) {
    return <>{children}</>;
  }

  return render(ui, { wrapper: AllProviders, ...options });
}

export * from "@testing-library/react";
export { customRender as render };
