import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copyToClipboard } from "./clipboard";

describe("copyToClipboard", () => {
  const originalWindow = global.window;
  const originalNavigator = global.navigator;
  const originalDocument = global.document;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(global, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(global, "document", {
      value: originalDocument,
      configurable: true,
      writable: true,
    });
  });

  it("returns false for empty text or SSR", async () => {
    Object.defineProperty(global, "window", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const res = await copyToClipboard("something");
    expect(res).toBe(false);

    Object.defineProperty(global, "window", {
      value: {},
      configurable: true,
      writable: true,
    });
    expect(await copyToClipboard("")).toBe(false);
  });

  it("uses navigator.clipboard.writeText when available and successful", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, "window", {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(global, "navigator", {
      value: {
        clipboard: {
          writeText: writeTextMock,
        },
      },
      configurable: true,
      writable: true,
    });

    const res = await copyToClipboard("test-search-query");
    expect(res).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith("test-search-query");
  });

  it("falls back to document.execCommand when navigator.clipboard fails", async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error("Permission denied"));
    const execCommandMock = vi.fn().mockReturnValue(true);

    const mockTextArea = {
      value: "",
      style: {},
      setAttribute: vi.fn(),
      focus: vi.fn(),
      select: vi.fn(),
      setSelectionRange: vi.fn(),
    };
    const createElementMock = vi.fn().mockReturnValue(mockTextArea);
    const appendChildMock = vi.fn();
    const removeChildMock = vi.fn();

    Object.defineProperty(global, "window", {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(global, "navigator", {
      value: {
        clipboard: {
          writeText: writeTextMock,
        },
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(global, "document", {
      value: {
        createElement: createElementMock,
        body: {
          appendChild: appendChildMock,
          removeChild: removeChildMock,
        },
        execCommand: execCommandMock,
      },
      configurable: true,
      writable: true,
    });

    const res = await copyToClipboard("fallback-keyword");
    expect(res).toBe(true);
    expect(createElementMock).toHaveBeenCalledWith("textarea");
    expect(mockTextArea.value).toBe("fallback-keyword");
    expect(appendChildMock).toHaveBeenCalledWith(mockTextArea);
    expect(execCommandMock).toHaveBeenCalledWith("copy");
    expect(removeChildMock).toHaveBeenCalledWith(mockTextArea);
  });

  it("falls back to document.execCommand when navigator.clipboard is missing", async () => {
    const execCommandMock = vi.fn().mockReturnValue(true);
    const mockTextArea = {
      value: "",
      style: {},
      setAttribute: vi.fn(),
      focus: vi.fn(),
      select: vi.fn(),
      setSelectionRange: vi.fn(),
    };

    Object.defineProperty(global, "window", {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(global, "navigator", {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(global, "document", {
      value: {
        createElement: vi.fn().mockReturnValue(mockTextArea),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
        execCommand: execCommandMock,
      },
      configurable: true,
      writable: true,
    });

    const res = await copyToClipboard("fallback-no-clipboard");
    expect(res).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith("copy");
  });
});
