"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[CanvasErrorBoundary] Uncaught canvas error:", error, errorInfo);
  }

  handleRecover = () => {
    try {
      // Clear custom edges and custom cards that might have had broken references
      useSiftStore.setState({
        customEdges: [],
      });
    } catch {
      // ignore
    }
    this.setState({ hasError: false, error: null });
  };

  handleFullReset = () => {
    try {
      siftActions.reset();
    } catch {
      // ignore
    }
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-stone-50/80 p-6 backdrop-blur-xs">
          <div className="max-w-md w-full rounded-2xl border border-stone-200 bg-white p-6 shadow-xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-stone-900">
                画布遇到渲染异常
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                当前浏览器缓存中的连线或卡片数据可能存在不兼容状态。你可以尝试一键修复或重置工作区。
              </p>
              {this.state.error?.message && (
                <div className="mt-2 rounded-lg bg-stone-100 p-2 font-mono text-[10px] text-stone-600 text-left truncate">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={this.handleRecover}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>清理连线并恢复</span>
              </button>
              <button
                type="button"
                onClick={this.handleFullReset}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 text-stone-400" />
                <span>新建工作区</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
