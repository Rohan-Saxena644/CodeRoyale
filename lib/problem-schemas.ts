import { z } from "zod";

export const competitiveProblemSchema = z.object({
  mode: z.literal("competitive"),
  title: z.string().min(3),
  statement: z.string().min(20),
  difficulty: z.enum(["easy", "medium", "hard"]),
  constraints: z.array(z.string().min(2)).min(1),
  functionSignature: z.object({
    name: z.string(),
    params: z.array(z.object({
      name: z.string(),
      type: z.enum(["number", "number[]", "string", "string[]", "boolean"])
    })),
    returnType: z.enum(["number", "number[]", "string", "string[]", "boolean"])
  }),
  examples: z.array(z.object({
    args: z.array(z.unknown()),
    output: z.unknown(),
    explanation: z.string().optional()
  })).min(1),
  testCases: z.array(z.object({
    args: z.array(z.unknown()),
    expectedOutput: z.unknown(),
    isHidden: z.boolean().default(false)
  })).min(3),
  referenceSolution: z.object({
    language: z.enum(["python", "javascript", "cpp", "go", "rust"]),
    code: z.string(),
    approach: z.string()
  }).optional(),
  sourceKind: z.enum(["generated", "permissive"])
});

export const devProblemSchema = z.object({
  mode: z.literal("dev"),
  category: z.enum(["react-ui", "express-api", "go-backend", "rust-backend", "next-actions"]),
  title: z.string().min(8),
  scenario: z.string().min(30),
  bugDescription: z.string().min(20),
  expectedFix: z.string().min(20),
  starterFiles: z.array(
    z.object({
      path: z.string().min(1),
      content: z.string().min(1),
      readOnly: z.boolean().default(false)
    })
  ),
  assertions: z.array(
    z.object({
      id: z.string().min(1),
      description: z.string().min(5),
      kind: z.enum(["dom", "http", "stdout"]),
      expected: z.string().min(1)
    })
  ),
  runner: z.object({
    command: z.string().min(2),
    timeoutMs: z.number().int().positive().max(10000)
  }),
  sourceKind: z.enum(["generated", "permissive"])
});

export const generatedProblemSchema = z.discriminatedUnion("mode", [
  competitiveProblemSchema,
  devProblemSchema
]);

export type CompetitiveProblem = z.infer<typeof competitiveProblemSchema>;
export type DevProblem = z.infer<typeof devProblemSchema>;
export type GeneratedProblem = z.infer<typeof generatedProblemSchema>;
