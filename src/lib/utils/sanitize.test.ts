import { describe, it, expect } from "vitest";
import {
  sanitizeSvg,
  stripHtml,
  escapeHtml,
  removeControlChars,
  sanitizeFilename,
  sanitizeUrl,
  isSafeUrl,
  sanitizePath,
  escapeLikePattern,
  sanitizeSearchTerm,
  safeParseJson,
} from "@/lib/utils/sanitize";

describe("sanitizeSvg", () => {
  it("removes script tags", () => {
    const input = `<svg><script>alert("xss")</script><rect/></svg>`;
    expect(sanitizeSvg(input)).not.toContain("<script");
    expect(sanitizeSvg(input)).toContain("<rect");
  });

  it("removes onclick event handlers", () => {
    const input = `<svg><rect onclick="alert(1)"/></svg>`;
    expect(sanitizeSvg(input)).not.toContain("onclick");
  });

  it("removes onmouseover event handlers with single quotes", () => {
    const input = `<svg><rect onmouseover='alert(1)'/></svg>`;
    expect(sanitizeSvg(input)).not.toContain("onmouseover");
  });

  it("removes javascript: protocols", () => {
    const input = `<svg><a href="javascript:alert(1)">link</a></svg>`;
    expect(sanitizeSvg(input)).not.toContain("javascript:");
  });

  it("removes dangerous data: URIs in href", () => {
    const input = `<svg><a href="data:text/html,<script>alert(1)</script>">link</a></svg>`;
    expect(sanitizeSvg(input)).not.toContain("data:text/html");
  });

  it("preserves data:image/* URIs in href (embedded images)", () => {
    const input = `<svg><image href="data:image/png;base64,iVBORw=="/></svg>`;
    expect(sanitizeSvg(input)).toContain("data:image/png");
  });

  it("preserves data:image/jpeg URIs in href", () => {
    const input = `<svg><image href="data:image/jpeg;base64,/9j/4=="/></svg>`;
    expect(sanitizeSvg(input)).toContain("data:image/jpeg");
  });

  it("removes dangerous data: URIs in xlink:href", () => {
    const input = `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="data:text/html,<script>alert(1)</script>"/></svg>`;
    expect(sanitizeSvg(input)).not.toContain("data:text/html");
  });

  it("preserves data:image/* URIs in xlink:href", () => {
    const input = `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="data:image/png;base64,iVBORw=="/></svg>`;
    expect(sanitizeSvg(input)).toContain("data:image/png");
  });

  it("removes xlink:href with javascript: protocol", () => {
    const input = `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="javascript:alert(1)">click</a></svg>`;
    expect(sanitizeSvg(input)).not.toContain("javascript:");
  });

  it("preserves legitimate SVG content", () => {
    const input = `<svg width="100" height="100"><rect id="shop1" x="10" y="10" width="50" height="50" fill="#ccc"/></svg>`;
    expect(sanitizeSvg(input)).toEqual(input);
  });
});

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("removes script and style tags", () => {
    expect(stripHtml("<script>code</script><style>css</style>text")).toBe(
      "text"
    );
  });

  it("collapses whitespace", () => {
    expect(stripHtml("a   b   c")).toBe("a b c");
  });
});

describe("escapeHtml", () => {
  it("escapes all HTML special characters", () => {
    expect(escapeHtml("<>&\"'`=/")).toBe(
      "&lt;&gt;&amp;&quot;&#39;&#x60;&#x3D;&#x2F;"
    );
  });

  it("leaves safe strings unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

describe("removeControlChars", () => {
  it("removes null bytes", () => {
    expect(removeControlChars("hello\x00world")).toBe("helloworld");
  });

  it("preserves normal text", () => {
    expect(removeControlChars("normal text")).toBe("normal text");
  });
});

describe("sanitizeFilename", () => {
  it("sanitizes filenames with special characters", () => {
    expect(sanitizeFilename("my file (1).txt")).toBe("my_file_1.txt");
  });

  it("limits filename length", () => {
    const longName = "a".repeat(300);
    expect(sanitizeFilename(longName + ".txt").length).toBeLessThan(220);
  });

  it("returns 'file' for empty input", () => {
    expect(sanitizeFilename("")).toBe("file");
  });
});

describe("sanitizeUrl", () => {
  it("allows http and https URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com/");
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("blocks javascript: protocol", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
  });

  it("blocks data: protocol", () => {
    expect(sanitizeUrl("data:text/html,payload")).toBe("");
  });

  it("blocks ftp: protocol", () => {
    expect(sanitizeUrl("ftp://example.com")).toBe("");
  });

  it("removes credentials from URLs", () => {
    expect(sanitizeUrl("https://user:pass@example.com")).not.toContain(
      "user:pass"
    );
  });

  it("returns empty string for invalid URLs", () => {
    expect(sanitizeUrl("not-a-url")).toBe("");
  });
});

describe("isSafeUrl", () => {
  it("returns true for https URLs", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
  });

  it("returns false for javascript: URLs", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("sanitizePath", () => {
  it("removes directory traversal", () => {
    expect(sanitizePath("../../secret")).toBe("secret");
  });

  it("removes leading slashes", () => {
    expect(sanitizePath("/api/users")).toBe("api/users");
  });

  it("removes trailing slashes", () => {
    expect(sanitizePath("api/users/")).toBe("api/users");
  });
});

describe("escapeLikePattern", () => {
  it("escapes % _ and \\ characters", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
    expect(escapeLikePattern("test_name")).toBe("test\\_name");
    expect(escapeLikePattern("path\\dir")).toBe("path\\\\dir");
  });
});

describe("sanitizeSearchTerm", () => {
  it("strips HTML and limits length", () => {
    expect(sanitizeSearchTerm("<script>alert(1)</script>hello")).toBe("hello");
    expect(sanitizeSearchTerm("a".repeat(200)).length).toBeLessThanOrEqual(100);
  });
});

describe("safeParseJson", () => {
  it("parses valid JSON", () => {
    expect(safeParseJson('{"key":"value"}')).toEqual({ key: "value" });
  });

  it("returns null for invalid JSON", () => {
    expect(safeParseJson("not json")).toBeNull();
  });

  it("returns null for oversized JSON", () => {
    expect(safeParseJson("x".repeat(2 * 1024 * 1024), 1024)).toBeNull();
  });
});
