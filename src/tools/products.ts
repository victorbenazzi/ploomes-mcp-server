import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PloomesClient } from "../client/ploomes-client.js";
import { buildODataParams } from "../client/odata-builder.js";
import {
  listResponse,
  getResponse,
  createResponse,
  updateResponse,
  deleteResponse,
  errorResponse,
  PloomesListResponse,
} from "../utils/formatter.js";
import { otherPropertySchema } from "../types/schemas.js";

export function registerProductTools(server: McpServer, client: PloomesClient): void {
  // ── LIST ──
  server.registerTool(
    "ploomes_products_list",
    {
      title: "List Products",
      description:
        "Search and list products in Ploomes CRM. Use to find product IDs for deals and quotes. Supports OData filtering, sorting, field selection, and pagination. Use $expand=OtherProperties to include custom fields.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter expression. E.g.: "contains(Name, \'widget\')", "UnitPrice gt 100"'),
        select: z.string().optional().describe('Comma-separated fields to return. E.g.: "Id,Name,UnitPrice,Code"'),
        expand: z.string().optional().describe('Related entities to include. E.g.: "Group, Family, Currency, Parts, OtherProperties"'),
        orderby: z.string().optional().describe('Sort expression. E.g.: "Name asc"'),
        top: z.number().optional().default(50).describe("Max items to return (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip for pagination"),
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

  // ── GET ──
  server.registerTool(
    "ploomes_products_get",
    {
      title: "Get Product",
      description: "Get a single product by ID from Ploomes CRM. Use $expand to include related entities like OtherProperties, Group, Family, or Parts.",
      inputSchema: {
        id: z.number().describe("Product ID"),
        expand: z.string().optional().describe('Related entities to include. E.g.: "OtherProperties,Group,Family"'),
        select: z.string().optional().describe('Fields to return. E.g.: "Id,Name,UnitPrice,Code"'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, expand, select }) => {
      try {
        const params = buildODataParams({
          filter: `Id eq ${id}`,
          expand,
          select,
          top: 1,
        });
        const data = await client.get<PloomesListResponse>("/Products", params);
        return getResponse("Product", id, data);
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
      description: "Create a new product in Ploomes CRM. Name is required.",
      inputSchema: {
        Name: z.string().describe("Product name (required)"),
        Code: z.string().optional().describe("Product code / SKU"),
        Description: z.string().optional().describe("Product description"),
        UnitPrice: z.number().optional().describe("Unit price"),
        GroupId: z.number().optional().describe("Product group ID"),
        MeasurementUnit: z.string().optional().describe("Measurement unit (e.g. 'un', 'kg', 'hr')"),
        ImageUrl: z.string().optional().describe("Product image URL"),
        CurrencyId: z.number().optional().describe("Currency ID — use ploomes_currencies_list"),
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
      description: "Update an existing product in Ploomes CRM by ID. Only provided fields are changed.",
      inputSchema: {
        id: z.number().describe("Product ID to update"),
        Name: z.string().optional().describe("Product name"),
        Code: z.string().optional().describe("Product code / SKU"),
        Description: z.string().optional().describe("Product description"),
        UnitPrice: z.number().optional().describe("Unit price"),
        GroupId: z.number().optional().describe("Product group ID"),
        MeasurementUnit: z.string().optional().describe("Measurement unit (e.g. 'un', 'kg', 'hr')"),
        ImageUrl: z.string().optional().describe("Product image URL"),
        CurrencyId: z.number().optional().describe("Currency ID — use ploomes_currencies_list"),
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
