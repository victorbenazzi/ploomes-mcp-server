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
  jsonResponse,
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

export function registerContactTools(server: McpServer, client: PloomesClient): void {
  // ── LIST ──
  server.registerTool(
    "ploomes_contacts_list",
    {
      title: "List Contacts",
      description:
        "Search and list contacts in Ploomes CRM. Supports OData filtering, sorting, field selection, and pagination. Use $expand=OtherProperties to include custom fields.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter expression. E.g.: "Name eq \'João\'" or "StatusId eq 1"'),
        select: z.string().optional().describe('Comma-separated fields to return. E.g.: "Id,Name,Email"'),
        expand: z.string().optional().describe('Related entities to include. E.g.: "OtherProperties,Tags"'),
        orderby: z.string().optional().describe('Sort expression. E.g.: "Name asc"'),
        top: z.number().optional().default(50).describe("Max items to return (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip for pagination"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Contacts", buildODataParams(input));
        return listResponse("contact", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── GET ──
  server.registerTool(
    "ploomes_contacts_get",
    {
      title: "Get Contact",
      description: "Get a single contact by ID from Ploomes CRM. Use $expand to include related entities like OtherProperties, Tags, or InteractionRecords.",
      inputSchema: {
        id: z.number().describe("Contact ID"),
        expand: z.string().optional().describe('Related entities to include. E.g.: "OtherProperties,Tags"'),
        select: z.string().optional().describe('Fields to return. E.g.: "Id,Name,Email"'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, expand, select }) => {
      try {
        const params: Record<string, string> = {};
        if (expand) params["$expand"] = expand;
        if (select) params["$select"] = select;
        const data = await client.get<PloomesListResponse>(`/Contacts(${id})`, params);
        return jsonResponse(`Contact ${id}:`, data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── CREATE ──
  server.registerTool(
    "ploomes_contacts_create",
    {
      title: "Create Contact",
      description:
        "Create a new contact in Ploomes CRM. Name is required. Use OtherProperties to set custom fields.",
      inputSchema: {
        Name: z.string().describe("Contact name (required)"),
        TypeId: z.number().optional().describe("Contact type ID"),
        LegalName: z.string().optional().describe("Legal / company name"),
        Register: z.string().optional().describe("CPF or CNPJ"),
        Email: z.string().optional().describe("Email address"),
        Phone: z.string().optional().describe("Phone number"),
        StatusId: z.number().optional().describe("Status ID"),
        CompanyId: z.number().optional().describe("Parent company contact ID"),
        OwnerId: z.number().optional().describe("Owner user ID"),
        OriginId: z.number().optional().describe("Origin ID"),
        StreetAddress: z.string().optional().describe("Street address"),
        ZipCode: z.string().optional().describe("Zip / postal code"),
        CityId: z.number().optional().describe("City ID"),
        Note: z.string().optional().describe("Free-text note"),
        Website: z.string().optional().describe("Website URL"),
        Revenue: z.number().optional().describe("Annual revenue"),
        OtherProperties: z.array(otherPropertySchema).optional().describe("Custom field values"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.post<PloomesListResponse>("/Contacts", input);
        return createResponse("Contact", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── UPDATE ──
  server.registerTool(
    "ploomes_contacts_update",
    {
      title: "Update Contact",
      description: "Update an existing contact in Ploomes CRM by ID. Only provided fields are changed.",
      inputSchema: {
        id: z.number().describe("Contact ID to update"),
        Name: z.string().optional().describe("Contact name"),
        TypeId: z.number().optional().describe("Contact type ID"),
        LegalName: z.string().optional().describe("Legal / company name"),
        Register: z.string().optional().describe("CPF or CNPJ"),
        Email: z.string().optional().describe("Email address"),
        Phone: z.string().optional().describe("Phone number"),
        StatusId: z.number().optional().describe("Status ID"),
        CompanyId: z.number().optional().describe("Parent company contact ID"),
        OwnerId: z.number().optional().describe("Owner user ID"),
        OriginId: z.number().optional().describe("Origin ID"),
        StreetAddress: z.string().optional().describe("Street address"),
        ZipCode: z.string().optional().describe("Zip / postal code"),
        CityId: z.number().optional().describe("City ID"),
        Note: z.string().optional().describe("Free-text note"),
        Website: z.string().optional().describe("Website URL"),
        Revenue: z.number().optional().describe("Annual revenue"),
        OtherProperties: z.array(otherPropertySchema).optional().describe("Custom field values"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, ...fields }) => {
      try {
        await client.patch(`/Contacts(${id})`, fields);
        return updateResponse("Contact", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── DELETE ──
  server.registerTool(
    "ploomes_contacts_delete",
    {
      title: "Delete Contact",
      description: "Delete a contact from Ploomes CRM by ID. This action is irreversible.",
      inputSchema: {
        id: z.number().describe("Contact ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        await client.delete(`/Contacts(${id})`);
        return deleteResponse("Contact", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );
}
