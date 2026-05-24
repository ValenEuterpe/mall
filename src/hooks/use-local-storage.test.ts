import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorageToggle } from "@/hooks/use-local-storage";

describe("useLocalStorageToggle", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default value when no stored value exists", () => {
    const { result } = renderHook(() =>
      useLocalStorageToggle("test-key", false)
    );
    expect(result.current[0]).toBe(false);
  });

  it("returns stored value when it exists", () => {
    localStorage.setItem("test-key", "true");
    const { result } = renderHook(() =>
      useLocalStorageToggle("test-key", false)
    );
    expect(result.current[0]).toBe(true);
  });

  it("toggles value", () => {
    const { result } = renderHook(() =>
      useLocalStorageToggle("test-key", false)
    );
    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(true);
  });

  it("persists toggled value to localStorage", () => {
    const { result } = renderHook(() =>
      useLocalStorageToggle("test-key", false)
    );

    act(() => {
      result.current[1]();
    });

    const stored = localStorage.getItem("test-key");
    const parsed = JSON.parse(stored!);
    expect(parsed.value).toBe(true);
    expect(parsed.timestamp).toBeDefined();
  });
});
