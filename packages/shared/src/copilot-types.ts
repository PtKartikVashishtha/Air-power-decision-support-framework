import { z } from 'zod';

export const CopilotIntentEnum = z.enum([
  'RETASK_THREAT',
  'CANCEL_SORTIE',
  'SWAP_AIRFRAME',
  'GROUND_AIRCRAFT',
  'CLOSE_AIRBASE',
  'ADD_TST_TARGET',
  'SET_PRIORITY',
  'QUERY_STATUS',
  'EXPLAIN_ASSIGNMENT',
  'WHAT_IF_FORK',
  'SWITCH_COA',
  'CONTROL_TIME',
  'HELP',
  'UNDO_LAST_ACTION',
  'AMBIGUOUS_CLARIFY',
  'INVALID_UNSAFE',
]);
export type CopilotIntent = z.infer<typeof CopilotIntentEnum>;

export const CopilotSlotsSchema = z.object({
  targetId: z.string().optional(),
  targetName: z.string().optional(),
  tailNumber: z.string().optional(),
  secondTailNumber: z.string().optional(),
  baseId: z.string().optional(),
  baseName: z.string().optional(),
  sortieId: z.string().optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  coaType: z.enum(['MAX_EFFECT', 'MIN_RISK', 'BALANCED_RESERVE']).optional(),
  timeAction: z.enum(['PLAY', 'PAUSE', 'SPEED', 'SEEK']).optional(),
  timeSpeed: z.number().optional(),
  timeMinutes: z.number().optional(),
  threatSector: z.string().optional(),
  count: z.number().optional(),
  aircraftModel: z.string().optional(),
  reason: z.string().optional(),
});
export type CopilotSlots = z.infer<typeof CopilotSlotsSchema>;

export const DryRunPreviewSchema = z.object({
  impactedSortiesCount: z.number(),
  stabilityIndex: z.number().min(0).max(100),
  kpiDelta: z.object({
    coveredTargetsDelta: z.number(),
    riskDelta: z.number(),
    fuelDeltaKg: z.number(),
  }),
  affectedTails: z.array(z.string()),
  summary: z.string(),
});
export type DryRunPreview = z.infer<typeof DryRunPreviewSchema>;

export const ClarificationDetailsSchema = z.object({
  missingSlot: z.string(),
  prompt: z.string(),
  options: z.array(z.string()).optional(),
});
export type ClarificationDetails = z.infer<typeof ClarificationDetailsSchema>;

export const CopilotCommandASTSchema = z.object({
  id: z.string(),
  rawQuery: z.string(),
  intent: CopilotIntentEnum,
  confidence: z.number().min(0).max(1),
  slots: CopilotSlotsSchema,
  requiresConfirmation: z.boolean(),
  clarification: ClarificationDetailsSchema.optional(),
  dryRunPreview: DryRunPreviewSchema.optional(),
  explanation: z.string().optional(),
  errorMessage: z.string().optional(),
  isSafe: z.boolean(),
});
export type CopilotCommandAST = z.infer<typeof CopilotCommandASTSchema>;

export interface CopilotCorpusEntry {
  id: string;
  category: string;
  query: string;
  expectedIntent: CopilotIntent;
  expectedSlots?: Partial<CopilotSlots>;
  shouldBeSafe: boolean;
  requiresClarification?: boolean;
}
