import { z } from "zod";

export const ItemStatusSchema = z.enum(["determined", "undetermined", "discarded"]);

export const CanvasItemTypeSchema = z.enum([
  "text",
  "image",
  "direction",
  "exploration_card",
]);

export const CanvasItemSchema = z.object({
  id: z.string().min(1),
  type: CanvasItemTypeSchema,
  branchId: z.string().min(1),
  status: ItemStatusSchema.default("undetermined"),
  title: z.string().optional(),
  content: z.string().default(""),
  imageUrl: z.string().optional(),
  sourceNodeId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.number().default(() => Date.now()),
});

export const BranchConstraintSchema = z.object({
  id: z.string().min(1),
  sourceItemId: z.string().min(1),
  type: CanvasItemTypeSchema,
  content: z.string().min(1),
  title: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const BranchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().nullable(),
  sourceNodeId: z.string().nullable(),
  inheritedConstraints: z.array(BranchConstraintSchema).default([]),
  color: z.string().optional(),
  createdAt: z.number().default(() => Date.now()),
});

export const SchemeGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  branchId: z.string().optional(),
  itemIds: z.array(z.string()).default([]),
  color: z.string().optional(),
  collapsed: z.boolean().default(false),
  summary: z.string().optional(),
  createdAt: z.number().default(() => Date.now()),
});

export const BranchExploreInputSchema = z.object({
  branchId: z.string().min(1),
  branchName: z.string().optional(),
  parentNodeId: z.string().nullable().optional(),
  inheritedConstraints: z.array(BranchConstraintSchema).default([]),
  discardedItems: z.array(z.string()).default([]),
  userPrompt: z.string().optional(),
  explorationMode: z
    .enum(["high_constraint", "low_constraint"])
    .default("high_constraint"),
});

export const GeneratedCanvasCardSchema = z.object({
  title: z.string().min(1).max(80),
  content: z.string().min(1).max(500),
  tags: z.array(z.string().max(30)).default([]),
  hypothesis: z.string().max(200).optional(),
});

export const BranchExploreOutputSchema = z.object({
  branchSummary: z.string().min(1).max(300),
  generatedCards: z.array(GeneratedCanvasCardSchema).min(1).max(5),
});
