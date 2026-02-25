import { z } from 'zod';

export const whereFilterSchema = z.record(z.string(), z.any()).describe(
  `A structured JSON filter.
    - SIMPLE: {"column": "value"} 
    - OPERATORS: {"column": {"gt": 10, "lt": 20}} (Supports: eq, ne, gt, gte, lt, lte, in, notIn, like, ilike)
    - LOGIC: {"and": [...]} or {"or": [...]} 
    - NESTING: {"or": [{"status": "active"}, {"and": [{"votes": {"gt": 10}}, {"type": "admin"}]}]}
    - NOTE: Do not use raw SQL; use this object structure.`
);
