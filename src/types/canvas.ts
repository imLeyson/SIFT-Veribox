import type { z } from "zod";
import type {
  ItemStatusSchema,
  CanvasItemTypeSchema,
  CanvasItemSchema,
  BranchConstraintSchema,
  BranchSchema,
  SchemeGroupSchema,
  BranchExploreInputSchema,
  BranchExploreOutputSchema,
  GeneratedCanvasCardSchema,
} from "@/lib/agent/canvas-schema";

export type ItemStatus = z.infer<typeof ItemStatusSchema>;
export type CanvasItemType = z.infer<typeof CanvasItemTypeSchema>;
export type CanvasItem = z.infer<typeof CanvasItemSchema>;
export type BranchConstraint = z.infer<typeof BranchConstraintSchema>;
export type Branch = z.infer<typeof BranchSchema>;
export type SchemeGroup = z.infer<typeof SchemeGroupSchema>;
export type BranchExploreInput = z.infer<typeof BranchExploreInputSchema>;
export type BranchExploreOutput = z.infer<typeof BranchExploreOutputSchema>;
export type GeneratedCanvasCard = z.infer<typeof GeneratedCanvasCardSchema>;
