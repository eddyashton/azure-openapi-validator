// Check that format is valid for a schema type.
// Valid formats are those defined in the OpenAPI spec and extensions in autorest.
// - https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#data-types
// - https://github.com/Azure/autorest/blob/main/packages/libs/openapi/src/v3/formats.ts

import type { IFunctionResult } from "@stoplight/spectral-core"
import type { JsonPath } from "@stoplight/types"

type Oas2Schema = {
  type: string
  format: string
  properties: { [key: string]: Oas2Schema }
  allOf: Oas2Schema[]
}

// `input` is the schema of a request or response body
function checkSchemaTypeAndFormat(schema: Oas2Schema, options: any, { path }: { path: JsonPath }): IFunctionResult[] {
  if (schema === null || typeof schema !== "object") {
    return [] as IFunctionResult[]
  }

  const errors: IFunctionResult[] = []

  const stringFormats = [
    // OAS-defined formats
    "byte",
    "binary",
    "date",
    "date-time",
    "password",
    // Additional formats recognized by autorest
    "char",
    "time",
    "date-time-rfc1123",
    "date-time-rfc7231", // Support for https://github.com/Azure/autorest/issues/4740
    "duration",
    "uuid",
    "base64url",
    "url",
    "odata-query",
    "certificate",
  ]

  if (schema.type === "string") {
    if (schema.format) {
      if (!stringFormats.includes(schema.format)) {
        errors.push({
          message: `Schema with type: string has unrecognized format: ${schema.format}`,
          path: [...path, "format"],
        })
      }
    }
  } else if (schema.type === "integer") {
    if (schema.format) {
      if (!["int32", "int64", "unixtime"].includes(schema.format)) {
        errors.push({
          message: `Schema with type: integer has unrecognized format: ${schema.format}`,
          path: [...path, "format"],
        })
      }
    } else {
      errors.push({
        message: "Schema with type: integer should specify format",
        path,
      })
    }
  } else if (schema.type === "number") {
    if (schema.format) {
      if (!["float", "double", "decimal"].includes(schema.format)) {
        errors.push({
          message: `Schema with type: number has unrecognized format: ${schema.format}`,
          path: [...path, "format"],
        })
      }
    } else {
      errors.push({
        message: "Schema with type: number should specify format",
        path,
      })
    }
  } else if (schema.type === "boolean") {
    if (schema.format) {
      errors.push({
        message: "Schema with type: boolean should not specify format",
        path: [...path, "format"],
      })
    }
  } else if (schema.properties && typeof schema.properties === "object") {
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(schema.properties)) {
      errors.push(...checkSchemaTypeAndFormat(value, options, { path: [...path, "properties", key] }))
    }
  }

  if (schema.allOf && Array.isArray(schema.allOf)) {
    // eslint-disable-next-line no-restricted-syntax
    for (const [index, value] of schema.allOf.entries()) {
      errors.push(...checkSchemaTypeAndFormat(value, options, { path: [...path, "allOf", index] }))
    }
  }

  return errors
}

export default checkSchemaTypeAndFormat
