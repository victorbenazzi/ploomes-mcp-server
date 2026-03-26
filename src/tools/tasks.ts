import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PloomesClient } from "../client/ploomes-client.js";
import { buildODataParams } from "../client/odata-builder.js";
import {
  listResponse,
  createResponse,
  updateResponse,
  deleteResponse,
  actionResponse,
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

export function registerTaskTools(server: McpServer, client: PloomesClient): void {
  // ── LIST ──
  server.registerTool(
    "ploomes_tasks_list",
    {
      title: "List Tasks",
      description:
        "Search and list tasks in Ploomes CRM. Filter by DealId, ContactId, OwnerId, Finished status, etc.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter. E.g.: "DealId eq 456 and Finished eq false"'),
        select: z.string().optional().describe('Fields to return. E.g.: "Id,Description,Date,Finished"'),
        expand: z.string().optional().describe('Related entities. E.g.: "Deal,Contact,Owner,OtherProperties"'),
        orderby: z.string().optional().describe('Sort. E.g.: "Date asc"'),
        top: z.number().optional().default(50).describe("Max items (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip for pagination"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Tasks", buildODataParams(input));
        return listResponse("task", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── CREATE ──
  server.registerTool(
    "ploomes_tasks_create",
    {
      title: "Create Task",
      description: "Create a new task in Ploomes CRM. Attach to a deal or contact via DealId / ContactId.",
      inputSchema: {
        Description: z.string().optional().describe("Task description"),
        Date: z.string().optional().describe("Due date in ISO 8601. E.g.: \"2025-06-15T10:00:00Z\""),
        Hour: z.string().optional().describe("Time string. E.g.: \"14:30\""),
        DealId: z.number().optional().describe("Associated deal ID"),
        ContactId: z.number().optional().describe("Associated contact ID"),
        OwnerId: z.number().optional().describe("Owner user ID"),
        TypeId: z.number().optional().describe("Task type ID"),
        OtherProperties: z.array(otherPropertySchema).optional().describe("Custom field values"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.post<PloomesListResponse>("/Tasks", input);
        return createResponse("Task", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── UPDATE ──
  server.registerTool(
    "ploomes_tasks_update",
    {
      title: "Update Task",
      description: "Update an existing task in Ploomes CRM by ID.",
      inputSchema: {
        id: z.number().describe("Task ID to update"),
        Description: z.string().optional().describe("Task description"),
        Date: z.string().optional().describe("Due date in ISO 8601"),
        Hour: z.string().optional().describe("Time string"),
        DealId: z.number().optional().describe("Associated deal ID"),
        ContactId: z.number().optional().describe("Associated contact ID"),
        OwnerId: z.number().optional().describe("Owner user ID"),
        TypeId: z.number().optional().describe("Task type ID"),
        OtherProperties: z.array(otherPropertySchema).optional().describe("Custom field values"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, ...fields }) => {
      try {
        await client.patch(`/Tasks(${id})`, fields);
        return updateResponse("Task", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── DELETE ──
  server.registerTool(
    "ploomes_tasks_delete",
    {
      title: "Delete Task",
      description: "Delete a task from Ploomes CRM by ID.",
      inputSchema: { id: z.number().describe("Task ID to delete") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        await client.delete(`/Tasks(${id})`);
        return deleteResponse("Task", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── FINISH ──
  server.registerTool(
    "ploomes_tasks_finish",
    {
      title: "Finish Task",
      description: "Mark a task as finished (completed) in Ploomes CRM.",
      inputSchema: { id: z.number().describe("Task ID to finish") },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        await client.post(`/Tasks(${id})/Finish`, {});
        return actionResponse("Task", id, "finished");
      } catch (err) {
        return errorResponse(err);
      }
    }
  );
}
