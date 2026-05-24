import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/use-debounce";

describe("useDebounce", () => {
  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("debounces value changes", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "hello", delay: 300 } }
    );

    rerender({ value: "world", delay: 300 });
    expect(result.current).toBe("hello");

    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });

    expect(result.current).toBe("world");
  });
});
