import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PloomesClient } from "../client/ploomes-client.js";
import { buildODataParams } from "../client/odata-builder.js";
import {
  listResponse,
  createResponse,
  updateResponse,
  deleteResponse,
  errorResponse,
  PloomesListResponse,
} from "../utils/formatter.js";

const otherPropertySchema = z.object({
  FieldKey: z.string().describe("Custom field key"),
  StringValue: z.string().optional(),
  IntegerValue: z.number().optional(),
  DateTimeValue: z.string().optional(),
  BoolValue: z.boolean().optional(),
  BigStringValue: z.string().optional(),
  ObjectValueName: z.string().optional(),
});

export function registerProductTools(server: McpServer, client: PloomesClient): void {
  // ── LIST ──
  server.registerTool(
    "ploomes_products_list",
    {
      title: "List Products",
      description: "List products in Ploomes CRM. Use to find product IDs for deals and quotes.",
      inputSchema: {
        filter: z.string().optional().describe("OData $filter expression"),
        select: z.string().optional().describe('Fields to return. E.g.: "Id,Name,Price"'),
        expand: z.string().optional().describe("Related entities to include"),
        orderby: z.string().optional().describe("Sort expression"),
        top: z.number().optional().default(50).describe("Max items (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Products", buildODataParams(input));
        return listResponse("product", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── CREATE ──
  server.registerTool(
    "ploomes_products_create",
    {
      title: "Create Product",
      description: "Create a new product in Ploomes CRM.",
      inputSchema: {
        Name: z.string().describe("Product name (required)"),
        Code: z.string().optional().describe("Product code / SKU"),
        Description: z.string().optional().describe("Product description"),
        Price: z.number().optional().describe("Unit price"),
        OtherProperties: z.array(otherPropertySchema).optional().describe("Custom field values"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.post<PloomesListResponse>("/Products", input);
        return createResponse("Product", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── UPDATE ──
  server.registerTool(
    "ploomes_products_update",
    {
      title: "Update Product",
      description: "Update an existing product in Ploomes CRM.",
      inputSchema: {
        id: z.number().describe("Product ID to update"),
        Name: z.string().optional().describe("Product name"),
        Code: z.string().optional().describe("Product code / SKU"),
        Description: z.string().optional().describe("Product description"),
        Price: z.number().optional().describe("Unit price"),
        OtherProperties: z.array(otherPropertySchema).optional().describe("Custom field values"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, ...fields }) => {
      try {
        await client.patch(`/Products(${id})`, fields);
        return updateResponse("Product", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── DELETE ──
  server.registerTool(
    "ploomes_products_delete",
    {
      title: "Delete Product",
      description: "Delete a product from Ploomes CRM by ID.",
      inputSchema: { id: z.number().describe("Product ID to delete") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        await client.delete(`/Products(${id})`);
        return deleteResponse("Product", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );
}
