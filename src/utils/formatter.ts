/**
 * Helpers for formatting MCP tool responses.
 */

const MAX_RESPONSE_CHARS = 50_000;

export interface ToolResponse {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function textResponse(text: string): ToolResponse {
  return { content: [{ type: "text" as const, text }] };
}

function truncate(text: string): string {
  if (text.length <= MAX_RESPONSE_CHARS) return text;
  return (
    text.slice(0, MAX_RESPONSE_CHARS) +
    "\n\n[Response truncated at 50000 chars. Use $select to limit fields or $top to reduce results.]"
  );
}

export function jsonResponse(label: string, data: unknown): ToolResponse {
  const json = JSON.stringify(data, null, 2);
  return textResponse(truncate(`${label}\n\n${json}`));
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
  const json = JSON.stringify(items, null, 2);
  return textResponse(truncate(`Found ${items.length} ${entityName}(s):\n\n${json}`));
}

export function getResponse(entityName: string, id: number, data: PloomesListResponse): ToolResponse {
  const item = data.value?.[0];
  if (!item) {
    return {
      content: [{ type: "text" as const, text: `${entityName} not found (Id: ${id})` }],
      isError: true,
    };
  }
  const json = JSON.stringify(item, null, 2);
  return textResponse(truncate(`${entityName} ${id}:\n\n${json}`));
}

export function createResponse(entityName: string, data: PloomesListResponse): ToolResponse {
  const item = data.value?.[0];
  const id = (item as Record<string, unknown>)?.Id ?? "unknown";
  const json = JSON.stringify(item, null, 2);
  return textResponse(truncate(`${entityName} created (Id: ${id}):\n\n${json}`));
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
