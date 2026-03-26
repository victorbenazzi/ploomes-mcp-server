import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PloomesClient } from "../client/ploomes-client.js";
import { buildODataParams } from "../client/odata-builder.js";
import { listResponse, errorResponse, PloomesListResponse } from "../utils/formatter.js";

export function registerPipelineTools(server: McpServer, client: PloomesClient): void {
  // ── LIST PIPELINES ──
  server.registerTool(
    "ploomes_pipelines_list",
    {
      title: "List Pipelines",
      description:
        "List all sales pipelines (funnels) in Ploomes CRM. Pipelines contain stages that deals move through.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter. E.g.: "Archived eq false"'),
        select: z.string().optional().describe("Fields to return"),
        orderby: z.string().optional().describe('Sort. E.g.: "Ordination asc"'),
        top: z.number().optional().default(50).describe("Max items (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Deals@Pipelines", buildODataParams(input));
        return listResponse("pipeline", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── LIST STAGES ──
  server.registerTool(
    "ploomes_stages_list",
    {
      title: "List Stages",
      description:
        "List pipeline stages in Ploomes CRM. Filter by PipelineId to get stages for a specific pipeline. Stages define the deal progression within a pipeline.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter. E.g.: "PipelineId eq 1"'),
        select: z.string().optional().describe("Fields to return"),
        orderby: z.string().optional().describe('Sort. E.g.: "Ordination asc"'),
        top: z.number().optional().default(100).describe("Max items (default 100, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Deals@Stages", buildODataParams(input));
        return listResponse("stage", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );
}
