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
        "List all sales pipelines (funnels) in Ploomes CRM. Pipelines contain stages that deals move through. " +
        "Each pipeline has configuration flags that control deal behavior: MustPassAllStages (deals must go through every stage in order), " +
        "ForbiddenStageReturn (deals cannot move back to a previous stage), MayWinDeals (deals in this pipeline can be won), " +
        "MayLoseDeals (deals in this pipeline can be lost), WinDealOnLastStage (deals are automatically won when moved to the last stage), " +
        "MayCreateQuotes (quotes can be created for deals in this pipeline), MayCreateOrders (orders can be created for deals in this pipeline). " +
        "Use $select to get specific fields. Key fields: Id, Name, Ordination, Archived, MustPassAllStages, ForbiddenStageReturn, " +
        "MayCreateQuotes, MayCreateOrders, MayWinDeals, MayLoseDeals, WinDealOnLastStage.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter expression. E.g.: "Archived eq false", "Name eq \'Sales\'"'),
        select: z.string().optional().describe('Fields to return. E.g.: "Id,Name,Ordination,Archived,MayWinDeals,MayLoseDeals"'),
        orderby: z.string().optional().describe('Sort expression. E.g.: "Ordination asc", "Name asc"'),
        top: z.number().optional().default(50).describe("Max items to return (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip for pagination"),
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
        "List pipeline stages in Ploomes CRM. Stages define the sequential steps within a pipeline that deals progress through. " +
        "Key fields: Id, Name, PipelineId, Ordination. The Ordination field determines the order of stages within a pipeline — " +
        "use orderby='Ordination asc' to get stages in their correct sequence. " +
        "Always filter by PipelineId to get stages for a specific pipeline. " +
        "Use ploomes_pipelines_list first to discover available PipelineId values.",
      inputSchema: {
        filter: z.string().optional().describe(
          'OData $filter expression. E.g.: "PipelineId eq 1", "PipelineId eq 1 and Ordination gt 3", ' +
          '"Name eq \'Negotiation\'"'
        ),
        select: z.string().optional().describe('Fields to return. E.g.: "Id,Name,PipelineId,Ordination"'),
        orderby: z.string().optional().describe('Sort expression. E.g.: "Ordination asc" to get stages in correct order'),
        top: z.number().optional().default(100).describe("Max items to return (default 100, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip for pagination"),
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
