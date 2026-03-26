import { z } from "zod";

export const otherPropertySchema = z.object({
  FieldKey: z.string().describe(
    "Custom field key. Use ploomes_fields_list to discover available field keys for the entity."
  ),
  StringValue: z.string().optional().describe("Value for short text fields (up to 255 chars)."),
  IntegerValue: z.number().optional().describe("Value for integer/numeric fields."),
  DateTimeValue: z.string().optional().describe(
    "Value for date/datetime fields. ISO 8601 format, e.g.: \"2025-06-15T00:00:00Z\"."
  ),
  BoolValue: z.boolean().optional().describe("Value for boolean (yes/no) fields."),
  BigStringValue: z.string().optional().describe(
    "Value for large text or decimal fields. Decimals as string, e.g.: \"1234.56\"."
  ),
  ObjectValueName: z.string().optional().describe(
    "Value for dropdown/option fields. Pass the exact option name (case-sensitive). Use ploomes_fields_options_list to see valid options."
  ),
});
