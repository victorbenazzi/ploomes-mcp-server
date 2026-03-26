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
  actionResponse,
  errorResponse,
  PloomesListResponse,
} from "../utils/formatter.js";
import { otherPropertySchema } from "../types/schemas.js";

export function registerDealTools(server: McpServer, client: PloomesClient): void {
  // ── LIST ──
  server.registerTool(
    "ploomes_deals_list",
    {
      title: "List Deals",
      description:
        "Search and list deals (opportunities) in Ploomes CRM. Supports OData filtering, sorting, field selection, and pagination. " +
        "Common filters: ContactId eq 123, StageId eq 456, StatusId eq 1, OwnerId eq 789, Amount gt 1000. " +
        "StatusId values: typically 1=Open, 2=Won, 3=Lost — use ploomes_deals_status_list to confirm the exact mapping for your account. " +
        "Use ploomes_stages_list to find valid StageId values. Use ploomes_users_list to find valid OwnerId values. " +
        "Available $expand options: Contact, Person, Stage, Status, Tags, Tasks, Products, Quotes, Origin, InteractionRecords, Orders, OtherProperties, Documents.",
      inputSchema: {
        filter: z.string().optional().describe(
          "OData $filter expression. Examples: \"ContactId eq 123\", \"StatusId eq 1\" (open deals), \"StageId eq 456 and OwnerId eq 789\", " +
          "\"Amount gt 5000\", \"contains(Title,'Acme')\", \"CreateDate gt 2025-01-01T00:00:00Z\". " +
          "Filter by custom field: \"OtherProperties/any(o: o/FieldId eq 12345 and o/StringValue eq 'value')\"."
        ),
        select: z.string().optional().describe("Comma-separated fields to return. E.g.: \"Id,Title,Amount,ContactId,StageId,StatusId,OwnerId,DealNumber\""),
        expand: z.string().optional().describe(
          "Related entities to include. Available: Contact, Person, Stage, Status, Tags, Tasks, Products, Quotes, Origin, InteractionRecords, Orders, OtherProperties, Documents. " +
          "E.g.: \"Contact,Stage,OtherProperties\" or \"Contact,Stage,Status,Tags,OtherProperties\"."
        ),
        orderby: z.string().optional().describe("Sort expression. E.g.: \"Amount desc\", \"CreateDate desc\", \"Title asc\""),
        top: z.number().optional().default(50).describe("Max items to return (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip for pagination"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Deals", buildODataParams(input));
        return listResponse("deal", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── GET ──
  server.registerTool(
    "ploomes_deals_get",
    {
      title: "Get Deal",
      description:
        "Get a single deal by ID from Ploomes CRM. Use $expand to include related entities. " +
        "Available $expand options: Contact, Person, Stage, Status, Tags, Tasks, Products, Quotes, Origin, InteractionRecords, Orders, OtherProperties, Documents.",
      inputSchema: {
        id: z.number().describe("Deal ID"),
        expand: z.string().optional().describe(
          "Related entities to include. Available: Contact, Person, Stage, Status, Tags, Tasks, Products, Quotes, Origin, InteractionRecords, Orders, OtherProperties, Documents. " +
          "E.g.: \"Contact,Stage,Status,OtherProperties,Tasks\"."
        ),
        select: z.string().optional().describe("Comma-separated fields to return. E.g.: \"Id,Title,Amount,ContactId,StageId,StatusId,DealNumber\""),
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
        const data = await client.get<PloomesListResponse>("/Deals", params);
        return getResponse("Deal", id, data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── CREATE ──
  server.registerTool(
    "ploomes_deals_create",
    {
      title: "Create Deal",
      description:
        "Create a new deal (opportunity) in Ploomes CRM. Title is required. " +
        "ContactId and PersonId both reference entities from /Contacts but serve different roles: " +
        "ContactId = the company/organization contact associated with the deal; PersonId = the individual person contact linked to the deal (often an employee of the company). " +
        "StageId determines which pipeline stage the deal starts in — use ploomes_pipelines_list to find pipelines, then ploomes_stages_list to find valid stage IDs within a pipeline. " +
        "If StageId is omitted, the deal defaults to the first stage of the first active pipeline. " +
        "DealNumber is read-only and auto-generated by Ploomes — do not set it. " +
        "Use ploomes_currencies_list to find valid CurrencyId values. Use ploomes_contacts_origins_list to find valid OriginId values. " +
        "Use OtherProperties to set custom fields (call ploomes_fields_list to discover available field keys).",
      inputSchema: {
        Title: z.string().describe("Deal title (required)"),
        ContactId: z.number().optional().describe("Company/organization contact ID. Both ContactId and PersonId reference /Contacts but represent different roles. Use this for the company."),
        PersonId: z.number().optional().describe("Individual person contact ID linked to the deal. Often an employee of the company in ContactId. Also from /Contacts."),
        StageId: z.number().optional().describe(
          "Pipeline stage ID. Determines which pipeline and stage the deal starts in. " +
          "Use ploomes_pipelines_list then ploomes_stages_list to find valid IDs. " +
          "Defaults to first stage of first active pipeline if omitted."
        ),
        OwnerId: z.number().optional().describe("Owner user ID. Use ploomes_users_list to find valid user IDs."),
        Amount: z.number().optional().describe("Deal monetary value (e.g., 15000.50)"),
        CurrencyId: z.number().optional().describe("Currency ID for the deal amount. Use ploomes_currencies_list to find valid IDs."),
        OriginId: z.number().optional().describe("Origin ID indicating where this deal came from. Use ploomes_contacts_origins_list to find valid IDs."),
        OtherProperties: z.array(otherPropertySchema).optional().describe(
          "Custom field values. Each entry must include FieldKey and exactly one value field (StringValue, IntegerValue, DateTimeValue, BoolValue, BigStringValue, or ObjectValueName). " +
          "Use ploomes_fields_list to discover available field keys for deals."
        ),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.post<PloomesListResponse>("/Deals", input);
        return createResponse("Deal", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── UPDATE ──
  server.registerTool(
    "ploomes_deals_update",
    {
      title: "Update Deal",
      description:
        "Update an existing deal in Ploomes CRM. Only provided fields are changed. " +
        "Use StageId to move a deal between stages within the same pipeline or to a different pipeline — " +
        "use ploomes_pipelines_list then ploomes_stages_list to find valid stage IDs. " +
        "ContactId and PersonId both reference /Contacts but serve different roles: " +
        "ContactId = company/organization, PersonId = individual person. " +
        "DealNumber is read-only and auto-generated — do not set it. " +
        "Use OtherProperties to update custom fields.",
      inputSchema: {
        id: z.number().describe("Deal ID to update"),
        Title: z.string().optional().describe("Deal title"),
        ContactId: z.number().optional().describe("Company/organization contact ID (from /Contacts)."),
        PersonId: z.number().optional().describe("Individual person contact ID (from /Contacts). Often an employee of the company in ContactId."),
        StageId: z.number().optional().describe(
          "Pipeline stage ID. Set this to move the deal to a different stage or pipeline. " +
          "Use ploomes_pipelines_list then ploomes_stages_list to find valid IDs."
        ),
        OwnerId: z.number().optional().describe("Owner user ID. Use ploomes_users_list to find valid user IDs."),
        Amount: z.number().optional().describe("Deal monetary value"),
        CurrencyId: z.number().optional().describe("Currency ID. Use ploomes_currencies_list to find valid IDs."),
        OriginId: z.number().optional().describe("Origin ID. Use ploomes_contacts_origins_list to find valid IDs."),
        OtherProperties: z.array(otherPropertySchema).optional().describe(
          "Custom field values to update. Each entry must include FieldKey and exactly one value field (StringValue, IntegerValue, DateTimeValue, BoolValue, BigStringValue, or ObjectValueName). " +
          "Use ploomes_fields_list to discover available field keys for deals."
        ),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, ...fields }) => {
      try {
        await client.patch(`/Deals(${id})`, fields);
        return updateResponse("Deal", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── DELETE ──
  server.registerTool(
    "ploomes_deals_delete",
    {
      title: "Delete Deal",
      description: "Delete a deal from Ploomes CRM by ID. This action is irreversible.",
      inputSchema: { id: z.number().describe("Deal ID to delete") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        await client.delete(`/Deals(${id})`);
        return deleteResponse("Deal", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── WIN ──
  server.registerTool(
    "ploomes_deals_win",
    {
      title: "Win Deal",
      description:
        "Mark a deal as won in Ploomes CRM. Sets the deal StatusId to 2 (Won). " +
        "The deal's pipeline must have MayWinDeals=true for this action to succeed — use ploomes_pipelines_list to check. " +
        "Only open deals (StatusId=1) can be won. Sends an empty body to POST /Deals({Id})/Win.",
      inputSchema: { id: z.number().describe("Deal ID to mark as won") },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        await client.post(`/Deals(${id})/Win`, {});
        return actionResponse("Deal", id, "marked as won");
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── LOSE ──
  server.registerTool(
    "ploomes_deals_lose",
    {
      title: "Lose Deal",
      description:
        "Mark a deal as lost in Ploomes CRM. Sets the deal StatusId to 3 (Lost). " +
        "Requires a LossReasonId — use ploomes_deals_loss_reasons_list to find valid loss reason IDs for your account. " +
        "Only open deals (StatusId=1) can be marked as lost.",
      inputSchema: {
        id: z.number().describe("Deal ID to mark as lost"),
        LossReasonId: z.number().describe("Loss reason ID (required). Use ploomes_deals_loss_reasons_list to find valid values."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, LossReasonId }) => {
      try {
        await client.post(`/Deals(${id})/Lose`, { LossReasonId });
        return actionResponse("Deal", id, "marked as lost");
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── REOPEN ──
  server.registerTool(
    "ploomes_deals_reopen",
    {
      title: "Reopen Deal",
      description:
        "Reopen a previously won or lost deal in Ploomes CRM. " +
        "The deal returns to its last stage before being won/lost, and its StatusId goes back to 1 (Open). " +
        "Only deals with StatusId=2 (Won) or StatusId=3 (Lost) can be reopened. Sends an empty body to POST /Deals({Id})/Reopen.",
      inputSchema: { id: z.number().describe("Deal ID to reopen (must be currently won or lost)") },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        await client.post(`/Deals(${id})/Reopen`, {});
        return actionResponse("Deal", id, "reopened");
      } catch (err) {
        return errorResponse(err);
      }
    }
  );
}
