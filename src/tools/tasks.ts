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

export function registerTaskTools(server: McpServer, client: PloomesClient): void {
  // ── LIST ──
  server.registerTool(
    "ploomes_tasks_list",
    {
      title: "List Tasks",
      description:
        "Search and list tasks in Ploomes CRM. Supports OData filtering, sorting, field selection, and pagination. " +
        "Filter by DealId, ContactId, OwnerId, TypeId, Finished status, Date range, and more. " +
        "Available $expand options: Type, Contact, Deal, Owner, Users, Tags, Comments, InteractionRecord, InteractionRecords, Creator, OtherProperties, Attachments.",
      inputSchema: {
        filter: z.string().optional().describe(
          "OData $filter expression. E.g.: \"DealId eq 456 and Finished eq false\", " +
          "\"OwnerId eq 42 and Date lt 2025-06-01T00:00:00Z\", \"TypeId eq 2\""
        ),
        select: z.string().optional().describe('Comma-separated fields to return. E.g.: "Id,Description,Date,Hour,Finished,DealId,ContactId,OwnerId,TypeId"'),
        expand: z.string().optional().describe(
          "Related entities to include. E.g.: \"Type,Contact,Deal,Owner,OtherProperties\". " +
          "Full list: Type, Contact, Deal, Owner, Users, Tags, Comments, InteractionRecord, InteractionRecords, Creator, OtherProperties, Attachments"
        ),
        orderby: z.string().optional().describe('Sort expression. E.g.: "Date asc", "Date desc"'),
        top: z.number().optional().default(50).describe("Max items to return (default 50, max 300)"),
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

  // ── GET ──
  server.registerTool(
    "ploomes_tasks_get",
    {
      title: "Get Task",
      description:
        "Get a single task by ID from Ploomes CRM. Use $expand to include related entities. " +
        "Available $expand options: Type, Contact, Deal, Owner, Users, Tags, Comments, InteractionRecord, InteractionRecords, Creator, OtherProperties, Attachments.",
      inputSchema: {
        id: z.number().describe("Task ID"),
        expand: z.string().optional().describe(
          "Related entities to include. E.g.: \"Type,Deal,Contact,Owner,OtherProperties\". " +
          "Full list: Type, Contact, Deal, Owner, Users, Tags, Comments, InteractionRecord, InteractionRecords, Creator, OtherProperties, Attachments"
        ),
        select: z.string().optional().describe('Fields to return. E.g.: "Id,Description,Date,Hour,Finished,DealId,ContactId"'),
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
        const data = await client.get<PloomesListResponse>("/Tasks", params);
        return getResponse("Task", id, data);
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
      description:
        "Create a new task in Ploomes CRM. Attach to a deal via DealId or to a contact via ContactId. " +
        "Date and Hour are separate fields: Date is the due date (ISO 8601), Hour is the time component as a string (e.g., '14:30'). " +
        "Use OtherProperties to set custom fields.",
      inputSchema: {
        Title: z.string().optional().describe("Task title / short summary"),
        Description: z.string().optional().describe("Task description with details about what needs to be done"),
        Date: z.string().optional().describe(
          "Due date in ISO 8601 format. This is the date component only — use Hour for the time. E.g.: \"2025-06-15T00:00:00Z\""
        ),
        Hour: z.string().optional().describe(
          "Time component as a string, separate from Date. E.g.: \"14:30\", \"09:00\". This is NOT part of the Date field — they are sent independently"
        ),
        DealId: z.number().optional().describe("Associated deal ID — links the task to a specific deal/opportunity"),
        ContactId: z.number().optional().describe("Associated contact ID — links the task to a specific contact"),
        OwnerId: z.number().optional().describe("Owner user ID — the user responsible for this task (use ploomes_users_list to find valid IDs)"),
        TypeId: z.number().optional().describe(
          "Task type ID — defines the kind of task (use ploomes_tasks_types_list to find valid IDs, e.g., Call, Meeting, Email, Visit)"
        ),
        OtherProperties: z.array(otherPropertySchema).optional().describe("Custom field values for the task (use ploomes_fields_list to discover available fields)"),
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
      description:
        "Update an existing task in Ploomes CRM by ID. Only provided fields are changed. " +
        "Date and Hour are separate fields: Date is the due date (ISO 8601), Hour is the time component as a string (e.g., '14:30').",
      inputSchema: {
        id: z.number().describe("Task ID to update"),
        Title: z.string().optional().describe("Task title / short summary"),
        Description: z.string().optional().describe("Task description with details about what needs to be done"),
        Date: z.string().optional().describe(
          "Due date in ISO 8601 format. This is the date component only — use Hour for the time. E.g.: \"2025-06-15T00:00:00Z\""
        ),
        Hour: z.string().optional().describe(
          "Time component as a string, separate from Date. E.g.: \"14:30\", \"09:00\". This is NOT part of the Date field — they are sent independently"
        ),
        DealId: z.number().optional().describe("Associated deal ID — links the task to a specific deal/opportunity"),
        ContactId: z.number().optional().describe("Associated contact ID — links the task to a specific contact"),
        OwnerId: z.number().optional().describe("Owner user ID — the user responsible for this task (use ploomes_users_list to find valid IDs)"),
        TypeId: z.number().optional().describe(
          "Task type ID — defines the kind of task (use ploomes_tasks_types_list to find valid IDs, e.g., Call, Meeting, Email, Visit)"
        ),
        OtherProperties: z.array(otherPropertySchema).optional().describe("Custom field values for the task (use ploomes_fields_list to discover available fields)"),
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
      description: "Delete a task from Ploomes CRM by ID. This action is irreversible.",
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
      description:
        "Mark a task as finished (completed) in Ploomes CRM. Sends {Finished: true} to the API. " +
        "This is an idempotent action — finishing an already-finished task has no adverse effect.",
      inputSchema: { id: z.number().describe("Task ID to mark as finished") },
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
