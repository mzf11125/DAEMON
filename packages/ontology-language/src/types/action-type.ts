import { z } from 'zod';

// Base schema for action parameters
const ActionParameterBaseSchema = z.object({
  name: z.string().min(1),
  required: z.boolean().default(false),
});

// Specific parameter type variants
const StringActionParameterSchema = ActionParameterBaseSchema.extend({
  type: z.literal('string'),
});

const NumberActionParameterSchema = ActionParameterBaseSchema.extend({
  type: z.literal('number'),
});

const BooleanActionParameterSchema = ActionParameterBaseSchema.extend({
  type: z.literal('boolean'),
});

const DateActionParameterSchema = ActionParameterBaseSchema.extend({
  type: z.literal('date'),
});

const EnumActionParameterSchema = ActionParameterBaseSchema.extend({
  type: z.literal('enum'),
  values: z.array(z.string()).min(1), // required for enum type
});

const ActionParameterSchema = z.discriminatedUnion('type', [
  StringActionParameterSchema,
  NumberActionParameterSchema,
  BooleanActionParameterSchema,
  DateActionParameterSchema,
  EnumActionParameterSchema,
]);

export type ActionParameter = z.infer<typeof ActionParameterSchema>;

// Pre-condition: validation before execution
const PreConditionSchema = z.object({
  type: z.enum(['FIELD_NOT_NULL', 'FIELD_EQUALS', 'FIELD_IN', 'OBJECT_EXISTS']),
  field: z.string().optional(),
  value: z.any().optional(),
  targetObjectType: z.string().optional(),
});

// Post-condition: state change after execution
const PostConditionSchema = z.object({
  type: z.enum(['SET_FIELD', 'INCREMENT_FIELD', 'CREATE_LINK', 'AUDIT']),
  field: z.string().optional(),
  value: z.any().optional(),
  linkType: z.string().optional(),
  targetObjectType: z.string().optional(),
});

// Side-effect: external actions triggered
const SideEffectSchema = z.object({
  type: z.enum(['CREATE_NEO4J_LINK', 'SEND_NOTIFICATION', 'TRIGGER_WEBHOOK']),
  config: z.record(z.any()),
});

export type PreCondition = z.infer<typeof PreConditionSchema>;
export type PostCondition = z.infer<typeof PostConditionSchema>;
export type SideEffect = z.infer<typeof SideEffectSchema>;

export const ActionTypeDefinitionSchema = z.object({
  apiName: z.string().min(1),
  displayName: z.string().min(1),
  targetObjectType: z.string().min(1),
  parameters: z.array(ActionParameterSchema),
  requiresApproval: z.boolean().default(true),
  description: z.string().optional(),
  preConditions: z.array(PreConditionSchema).optional(),
  postConditions: z.array(PostConditionSchema).optional(),
  sideEffects: z.array(SideEffectSchema).optional(),
});

export const ActionTypeSchema = z.object({
  actionType: ActionTypeDefinitionSchema,
});

export type ActionTypeDefinition = z.infer<typeof ActionTypeDefinitionSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;
