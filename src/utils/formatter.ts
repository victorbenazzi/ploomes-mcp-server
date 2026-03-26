/**
 * Helpers for formatting MCP tool responses.
 */

export interface ToolResponse {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function textResponse(text: string): ToolResponse {
  return { content: [{ type: "text" as const, text }] };
}

export function jsonResponse(label: string, data: unknown): ToolResponse {
  return textResponse(`${label}\n\n${JSON.stringify(data, null, 2)}`);
}

export function errorResponse(error: unknown): ToolResponse {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

export interface PloomesListResponse {
  value?: unknown[];
}

export function listResponse(entityName: string, data: PloomesListResponse): ToolResponse {
  const items = data.value ?? [];
  return jsonResponse(`Found ${items.length} ${entityName}(s):`, items);
}

export function createResponse(entityName: string, data: PloomesListResponse): ToolResponse {
  const item = data.value?.[0];
  const id = (item as Record<string, unknown>)?.Id ?? "unknown";
  return jsonResponse(`${entityName} created (Id: ${id}):`, item);
}

export function updateResponse(entityName: string, id: number): ToolResponse {
  return textResponse(`${entityName} ${id} updated successfully.`);
}

export function deleteResponse(entityName: string, id: number): ToolResponse {
  return textResponse(`${entityName} ${id} deleted successfully.`);
}

export function actionResponse(entityName: string, id: number, action: string): ToolResponse {
  return textResponse(`${entityName} ${id} ${action} successfully.`);
}
