import { describe, expect, it } from "vitest";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { artSchema, designSchema, freeformSchema, ideationSchema, labAssessmentSchema, labIdeasSchema, reviewSchema } from "@/lib/agents/schemas";
import { configSchemaFor } from "@/lib/engine/schemas";

// Every schema an agent answers with must be accepted by the API's structured outputs.
describe("agent schemas", () => {
  const schemas = {
    ideationSchema,
    designSchema,
    artSchema,
    freeformSchema,
    reviewSchema,
    labIdeasSchema,
    labAssessmentSchema,
    tile: configSchemaFor["tile-path"].omit({ theme: true }),
    garden: configSchemaFor.garden.omit({ theme: true }),
    constellation: configSchemaFor.constellation.omit({ theme: true }),
  };
  for (const [name, schema] of Object.entries(schemas)) {
    it(`${name} converts to a structured-output JSON schema`, () => {
      expect(() => zodOutputFormat(schema)).not.toThrow();
    });
  }
});
