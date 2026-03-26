/**
 * Builds OData query parameters from a standard input shape.
 */

export interface ODataInput {
  filter?: string;
  select?: string;
  expand?: string;
  orderby?: string;
  top?: number;
  skip?: number;
}

export function buildODataParams(input: ODataInput): Record<string, string> {
  const params: Record<string, string> = {};
  if (input.filter) params["$filter"] = input.filter;
  if (input.select) params["$select"] = input.select;
  if (input.expand) params["$expand"] = input.expand;
  if (input.orderby) params["$orderby"] = input.orderby;
  if (input.top !== undefined) params["$top"] = String(Math.min(input.top, 300));
  if (input.skip !== undefined) params["$skip"] = String(input.skip);
  return params;
}
