import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PloomesClient } from "../client/ploomes-client.js";
import { buildODataParams } from "../client/odata-builder.js";
import { listResponse, errorResponse, PloomesListResponse } from "../utils/formatter.js";

/**
 * Lookup / sub-resource tools for discovering valid IDs and enum values.
 * These are essential for agents to know what values to pass in TypeId, StatusId, etc.
 */
export function registerLookupTools(server: McpServer, client: PloomesClient): void {
  // ── CONTACT TYPES ──
  server.registerTool(
    "ploomes_contacts_types_list",
    {
      title: "List Contact Types",
      description:
        "List available contact types in Ploomes CRM (e.g., Pessoa/Person, Empresa/Company). Returns Id and Name for each type. Use the returned Id as TypeId when creating or filtering contacts.",
      inputSchema: {
        top: z.number().optional().default(50).describe("Max items"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Contacts@Types", buildODataParams(input));
        return listResponse("contact type", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── CONTACT STATUS ──
  server.registerTool(
    "ploomes_contacts_status_list",
    {
      title: "List Contact Statuses",
      description:
        "List available contact statuses in Ploomes CRM (e.g., Ativo/Active, Inativo/Inactive). Returns Id and Name. Use the returned Id as StatusId when creating or filtering contacts.",
      inputSchema: {
        top: z.number().optional().default(50).describe("Max items"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Contacts@Status", buildODataParams(input));
        return listResponse("contact status", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── CONTACT ORIGINS ──
  server.registerTool(
    "ploomes_contacts_origins_list",
    {
      title: "List Contact Origins",
      description:
        "List available contact/lead origins in Ploomes CRM (e.g., Website, Referral, Cold Call). Returns Id and Name. Use the returned Id as OriginId when creating contacts or deals.",
      inputSchema: {
        top: z.number().optional().default(50).describe("Max items"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Contacts@Origins", buildODataParams(input));
        return listResponse("contact origin", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── DEAL STATUS ──
  server.registerTool(
    "ploomes_deals_status_list",
    {
      title: "List Deal Statuses",
      description:
        "List available deal statuses in Ploomes CRM. Typically: 1=Open (Aberto), 2=Won (Ganho), 3=Lost (Perdido). Returns Id and Name. Use in $filter expressions like 'StatusId eq 1' to find open deals.",
      inputSchema: {
        top: z.number().optional().default(50).describe("Max items"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Deals@Status", buildODataParams(input));
        return listResponse("deal status", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── DEAL LOSS REASONS ──
  server.registerTool(
    "ploomes_deals_loss_reasons_list",
    {
      title: "List Deal Loss Reasons",
      description:
        "List available loss reasons for deals in Ploomes CRM. Returns Id and Name. You MUST provide a valid LossReasonId when calling ploomes_deals_lose. Loss reasons may be filtered by PipelineId.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter. E.g.: "PipelineId eq 1"'),
        top: z.number().optional().default(50).describe("Max items"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Deals@LossReasons", buildODataParams(input));
        return listResponse("loss reason", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── TASK TYPES ──
  server.registerTool(
    "ploomes_tasks_types_list",
    {
      title: "List Task Types",
      description:
        "List available task types in Ploomes CRM (e.g., Ligação/Call, Reunião/Meeting, E-mail, Visita/Visit). Returns Id, Name, Icon, Color. Use the returned Id as TypeId when creating tasks or interaction records.",
      inputSchema: {
        top: z.number().optional().default(50).describe("Max items"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Tasks@Types", buildODataParams(input));
        return listResponse("task type", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── CURRENCIES ──
  server.registerTool(
    "ploomes_currencies_list",
    {
      title: "List Currencies",
      description:
        "List available currencies in Ploomes CRM (e.g., BRL, USD, EUR). Returns Id, Symbol, Name, etc. Use the returned Id as CurrencyId when creating deals, orders, or products.",
      inputSchema: {
        top: z.number().optional().default(50).describe("Max items"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Currencies", buildODataParams(input));
        return listResponse("currency", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── FIELD ENTITIES ──
  server.registerTool(
    "ploomes_fields_entities_list",
    {
      title: "List Field Entities",
      description:
        "List entity types that support custom fields in Ploomes CRM. Returns Id and Name. Known EntityId values: 1=Contact, 2=Deal, 4=Order, 5=Order Section, 7=Quote, 8=Quote Section, 10=Product, 12=Task, 14=Quote Product, 20=Order Product, 36=Interaction Record. Use these when filtering ploomes_fields_list.",
      inputSchema: {
        top: z.number().optional().default(50).describe("Max items"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Fields@Entities", buildODataParams(input));
        return listResponse("field entity", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── FIELD TYPES ──
  server.registerTool(
    "ploomes_fields_types_list",
    {
      title: "List Field Types",
      description:
        "List available custom field types in Ploomes CRM. Returns Id, Name, NativeType. The NativeType tells you which value property to use in OtherProperties: String→StringValue, Integer→IntegerValue, Boolean→BoolValue, DateTime→DateTimeValue, Decimal→BigStringValue, Object (dropdown)→ObjectValueName.",
      inputSchema: {
        top: z.number().optional().default(50).describe("Max items"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Fields@Types", buildODataParams(input));
        return listResponse("field type", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── FIELD OPTIONS TABLES ──
  server.registerTool(
    "ploomes_fields_options_tables_list",
    {
      title: "List Field Options Tables",
      description:
        "List options tables (dropdown value sets) for custom fields in Ploomes CRM. Each table contains the valid options for a dropdown-type custom field. Use ploomes_fields_options_list to see the options within a table.",
      inputSchema: {
        filter: z.string().optional().describe("OData $filter expression"),
        top: z.number().optional().default(50).describe("Max items"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Fields@OptionsTables", buildODataParams(input));
        return listResponse("options table", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── FIELD OPTIONS ──
  server.registerTool(
    "ploomes_fields_options_list",
    {
      title: "List Field Options",
      description:
        "List individual options within a dropdown-type custom field in Ploomes CRM. Filter by OptionsTableId to get options for a specific dropdown field. Returns Id and Name for each option. Use the Name as ObjectValueName when writing OtherProperties.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter. E.g.: "OptionsTableId eq 123"'),
        top: z.number().optional().default(100).describe("Max items"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Fields@OptionsTables@Options", buildODataParams(input));
        return listResponse("field option", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── ORDER STAGES ──
  server.registerTool(
    "ploomes_orders_stages_list",
    {
      title: "List Order Stages",
      description:
        "List available order stages in Ploomes CRM. Returns Id and Name. Use the returned Id as StageId when creating or updating orders.",
      inputSchema: {
        top: z.number().optional().default(50).describe("Max items"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Orders@Stages", buildODataParams(input));
        return listResponse("order stage", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );
}
