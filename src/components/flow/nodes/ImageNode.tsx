"use client";

import { useState } from "react";
import {
  Handle,
  Position,
  NodeResizer,
  type NodeProps,
} from "@xyflow/react";
import { Trash2, Lock, Unlock, Move } from "lucide-react";
import { useSiftStore } from "@/lib/convergence-store";

export interface ImageNodeData {
  src: string;
  width?: number;
  height?: number;
  naturalWidth?: number;
  naturalHeight?: number;
  fileName?: string;
  lockAspectRatio?: boolean;
}

export function ImageNode({ id, data, selected }: NodeProps) {
  const updateCustomCard = useSiftStore((s) => s.updateCustomCard);
  const deleteNodeById = useSiftStore((s) => s.deleteNodeById);

  const imgData = (data || {}) as unknown as ImageNodeData;
  const initialWidth = imgData.width || 360;
  const initialHeight = imgData.height || 260;

  const [displaySize, setDisplaySize] = useState<{ width: number; height: number }>({
    width: initialWidth,
    height: initialHeight,
  });
  const [lockRatio, setLockRatio] = useState<boolean>(
    imgData.lockAspectRatio !== false, // default true
  );

  const currentWidth = displaySize.width;
  const currentHeight = displaySize.height;

  const toggleLockRatio = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !lockRatio;
    setLockRatio(nextVal);
    updateCustomCard(id, {
      data: {
        ...imgData,
        lockAspectRatio: nextVal,
      },
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNodeById(id);
  };

  return (
    <div
      style={{ width: currentWidth, height: currentHeight }}
      className={`card-drag group relative rounded-2xl transition-shadow select-none cursor-grab active:cursor-grabbing ${
        selected
          ? "ring-2 ring-[#0d99ff] shadow-xl"
          : "shadow-md hover:shadow-lg hover:ring-1 hover:ring-stone-300"
      }`}
    >
      {/* Figma-Style 8-Point Draggable NodeResizer */}
      <NodeResizer
        isVisible={selected}
        minWidth={100}
        minHeight={60}
        keepAspectRatio={lockRatio}
        color="#0d99ff"
        handleClassName="!w-2.5 !h-2.5 !bg-white !border-2 !border-[#0d99ff] !rounded-xs shadow-xs"
        lineClassName="!border-[#0d99ff] !border"
        onResize={(_e, params) => {
          setDisplaySize({ width: Math.round(params.width), height: Math.round(params.height) });
        }}
        onResizeEnd={(_e, params) => {
          const finalW = Math.round(params.width);
          const finalH = Math.round(params.height);
          setDisplaySize({ width: finalW, height: finalH });
          updateCustomCard(id, {
            data: {
              ...imgData,
              width: finalW,
              height: finalH,
            },
          });
        }}
      />

      {/* Floating Figma-like mini toolbar (visible on hover or when selected) */}
      <div
        className={`absolute -top-9 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-lg bg-stone-900/90 px-2 py-1 text-white shadow-xl backdrop-blur-md transition-all duration-150 ${
          selected
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
        }`}
      >
        <span
          className="card-drag flex items-center gap-1 text-[10px] font-mono text-stone-300 pr-1 border-r border-white/20 cursor-grab active:cursor-grabbing"
          title="按住此处或图片任意位置均可拖动平移"
        >
          <Move className="h-3 w-3 text-stone-400" />
          <span>
            {Math.round(currentWidth)} × {Math.round(currentHeight)}
          </span>
        </span>

        {/* Lock / Unlock Aspect Ratio */}
        <button
          type="button"
          onClick={toggleLockRatio}
          className={`nodrag p-0.5 rounded hover:bg-white/20 transition-colors cursor-pointer ${
            lockRatio ? "text-blue-400" : "text-stone-400"
          }`}
          title={lockRatio ? "锁定宽高比 (保持比例缩放)" : "解锁宽高比 (自由拉伸)"}
        >
          {lockRatio ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        </button>

        {/* Delete Image Card */}
        <button
          type="button"
          onClick={handleDelete}
          className="nodrag p-0.5 rounded hover:bg-red-500/30 text-stone-400 hover:text-red-400 transition-colors cursor-pointer"
          title="删除此参考图片 (Delete)"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Image Content Frame */}
      <div className="card-drag w-full h-full overflow-hidden rounded-2xl bg-stone-100/90 border border-stone-200/90 flex items-center justify-center relative cursor-grab active:cursor-grabbing">
        {imgData.src ? (
          <img
            src={imgData.src}
            alt={imgData.fileName || "Canvas Reference"}
            draggable={false}
            className="w-full h-full object-contain pointer-events-none select-none"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-stone-400 text-xs p-4 pointer-events-none">
            <Move className="h-8 w-8 stroke-1 text-stone-300 mb-1" />
            <span>无图片数据</span>
          </div>
        )}

        {/* Caption watermark if fileName provided */}
        {imgData.fileName && (
          <div className="absolute bottom-1.5 left-2 max-w-[85%] truncate rounded bg-stone-900/60 backdrop-blur-xs px-1.5 py-0.5 text-[9.5px] font-mono text-white/90 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {imgData.fileName}
          </div>
        )}
      </div>

      {/* Connection Handles (Optional Moodboard Wire Target / Source) */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={true}
        className="!w-2.5 !h-2.5 !rounded-full !bg-stone-400 hover:!bg-[#0d99ff] !border-2 !border-white transition-all cursor-crosshair !-left-[5px] opacity-0 group-hover:opacity-100 hover:scale-125"
        title="拖动或吸附引线"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={true}
        className="!w-2.5 !h-2.5 !rounded-full !bg-stone-400 hover:!bg-[#0d99ff] !border-2 !border-white transition-all cursor-crosshair !-right-[5px] opacity-0 group-hover:opacity-100 hover:scale-125"
        title="拖动或吸附引线"
      />
    </div>
  );
}
