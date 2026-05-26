import { z } from 'zod';

const PropertyBaseSchema = z.object({
  name: z.string().min(1),
  required: z.boolean().default(false),
});

const StringPropertySchema = PropertyBaseSchema.extend({
  type: z.literal('string'),
});

const NumberPropertySchema = PropertyBaseSchema.extend({
  type: z.literal('number'),
});

const BooleanPropertySchema = PropertyBaseSchema.extend({
  type: z.literal('boolean'),
});

const DatePropertySchema = PropertyBaseSchema.extend({
  type: z.literal('date'),
});

const TimestampPropertySchema = PropertyBaseSchema.extend({
  type: z.literal('timestamp'),
});

const EnumPropertySchema = PropertyBaseSchema.extend({
  type: z.literal('enum'),
  values: z.array(z.string()).min(1),
});

// NEW: Geo point
const GeoPointPropertySchema = PropertyBaseSchema.extend({
  type: z.literal('geo_point'),
});

// NEW: Reference to another object type
const ReferencePropertySchema = PropertyBaseSchema.extend({
  type: z.literal('reference'),
  targetObjectType: z.string().min(1),
});

// NEW: Array of any base type
const ArrayPropertySchema = PropertyBaseSchema.extend({
  type: z.literal('array'),
  items: z.object({
    type: z.enum(['string', 'number', 'boolean', 'date', 'timestamp', 'enum', 'reference']),
    values: z.array(z.string()).optional(),
    targetObjectType: z.string().optional(),
  }),
});

// NEW: Free-form JSON
const JsonPropertySchema = PropertyBaseSchema.extend({
  type: z.literal('json'),
});

const PropertySchema = z.discriminatedUnion('type', [
  StringPropertySchema,
  NumberPropertySchema,
  BooleanPropertySchema,
  DatePropertySchema,
  TimestampPropertySchema,
  EnumPropertySchema,
  GeoPointPropertySchema,
  ReferencePropertySchema,
  ArrayPropertySchema,
  JsonPropertySchema,
]);

export type Property = z.infer<typeof PropertySchema>;

export const ObjectTypeDefinitionSchema = z.object({
  apiName: z.string().min(1),
  displayName: z.string().min(1),
  primaryKey: z.string().min(1),
  titleProperty: z.string().min(1),
  properties: z.array(PropertySchema).min(1),
  description: z.string().optional(),
});

export const ObjectTypeSchema = z.object({
  objectType: ObjectTypeDefinitionSchema,
});

export type ObjectTypeDefinition = z.infer<typeof ObjectTypeDefinitionSchema>;
export type ObjectType = z.infer<typeof ObjectTypeSchema>;
