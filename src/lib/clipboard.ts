/**
 * 健壮的跨环境剪贴板复制工具
 * 兼容 HTTPS (navigator.clipboard) 与 HTTP / iframe / 受限环境 (document.execCommand 兜底)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined" || !text) {
    return false;
  }

  // 1. 优先尝试现代异步 Clipboard API（需安全上下文）
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // 记录并在静默失败时继续降级
      console.warn("Async clipboard.writeText failed, trying execCommand fallback:", err);
    }
  }

  // 2. 经典降级方案：创建隐藏 textarea 配合 document.execCommand('copy')
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // 避免在移动端造成滚动与聚焦视窗跳跃
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    textArea.style.opacity = "0";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);

    textArea.focus({ preventScroll: true });
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);

    if (successful) {
      return true;
    }
  } catch (fallbackErr) {
    console.error("execCommand copy fallback failed:", fallbackErr);
  }

  return false;
}
