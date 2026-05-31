"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export interface ThemeProviderProps extends React.ComponentProps<
  typeof NextThemesProvider
> {}

/**
 * Client-side theme provider (next-themes) used by shadcn/ui components.
 * Mount once at the app root.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
