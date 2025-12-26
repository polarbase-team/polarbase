import { z } from 'zod';

const OperatorFilterSchema = z
  .object({
    eq: z.any().optional(),
    ne: z.any().optional(),
    gt: z.any().optional(),
    gte: z.any().optional(),
    lt: z.any().optional(),
    lte: z.any().optional(),
    in: z.array(z.any()).optional(),
    notIn: z.array(z.any()).optional(),
    like: z.any().optional(),
    ilike: z.any().optional(),
    notLike: z.any().optional(),
    notIlike: z.any().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length === 1, {
    message: 'Each operator filter must have exactly one operator',
  });

const ColumnFilterSchema: z.ZodType<any> = z.record(
  z.string(),
  z.union([z.any(), OperatorFilterSchema])
);

const LogicGroupSchema: z.ZodType<any> = z
  .object({
    and: z.lazy(() => z.array(ConditionSchema)).optional(),
    or: z.lazy(() => z.array(ConditionSchema)).optional(),
  })
  .strict()
  .refine(
    (data) => {
      const keys = Object.keys(data);
      return keys.length === 1 && (keys[0] === 'and' || keys[0] === 'or');
    },
    {
      message:
        "Logic group must have either 'and' or 'or' (not both, not none)",
    }
  );

export const ConditionSchema: z.ZodType<any> = z.union([
  ColumnFilterSchema,
  LogicGroupSchema,
]);
