import { z, type ZodTypeAny } from "zod";

export type JsonSchema = Record<string, unknown>;

/**
 * Minimal zod → JSON Schema converter for the schema shapes used by our
 * tools and structured outputs. `strict` produces schemas compatible with
 * provider structured-output modes (every property required, optional
 * values expressed as nullable, no additional properties).
 */
export function toJsonSchema(schema: ZodTypeAny, strict = false): JsonSchema {
  const description = schema.description;
  const out = convert(schema, strict);
  if (description && !out.description) out.description = description;
  return out;
}

function convert(schema: ZodTypeAny, strict: boolean): JsonSchema {
  const def = schema._def as { typeName: string; [k: string]: unknown };
  const withDesc = (s: JsonSchema) => (schema.description ? { ...s, description: schema.description } : s);
  switch (def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodString:
      return withDesc({ type: "string" });
    case z.ZodFirstPartyTypeKind.ZodNumber: {
      const checks = (def.checks as { kind: string }[] | undefined) ?? [];
      return withDesc({ type: checks.some((c) => c.kind === "int") ? "integer" : "number" });
    }
    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return withDesc({ type: "boolean" });
    case z.ZodFirstPartyTypeKind.ZodEnum:
      return withDesc({ type: "string", enum: def.values as string[] });
    case z.ZodFirstPartyTypeKind.ZodLiteral:
      return withDesc({ const: def.value as unknown });
    case z.ZodFirstPartyTypeKind.ZodArray:
      return withDesc({ type: "array", items: toJsonSchema(def.type as ZodTypeAny, strict) });
    case z.ZodFirstPartyTypeKind.ZodNullable: {
      const inner = toJsonSchema(def.innerType as ZodTypeAny, strict);
      return withDesc({ anyOf: [inner, { type: "null" }] });
    }
    case z.ZodFirstPartyTypeKind.ZodOptional: {
      const inner = toJsonSchema(def.innerType as ZodTypeAny, strict);
      return strict ? withDesc({ anyOf: [inner, { type: "null" }] }) : withDesc(inner);
    }
    case z.ZodFirstPartyTypeKind.ZodDefault:
      return withDesc(toJsonSchema(def.innerType as ZodTypeAny, strict));
    case z.ZodFirstPartyTypeKind.ZodEffects:
      return withDesc(toJsonSchema(def.schema as ZodTypeAny, strict));
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = toJsonSchema(value as ZodTypeAny, strict);
        const optional = (value as ZodTypeAny).isOptional();
        if (strict || !optional) required.push(key);
      }
      return withDesc({ type: "object", properties, required, additionalProperties: false });
    }
    default:
      return withDesc({});
  }
}

/** Convert explicit nulls back to undefined so zod `.optional()` fields parse. */
export function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNulls);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) if (v !== null) out[k] = stripNulls(v);
    return out;
  }
  return value;
}
