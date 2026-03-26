# Architecture

[&larr; Back to README](../README.md)

---

## System Overview

The Ploomes MCP Server acts as a bridge between MCP-compatible AI clients and the Ploomes CRM REST API. It translates MCP tool calls into HTTP requests, handles authentication, rate limiting, retries, and formats responses back to the AI agent.

```
AI Client (Claude.ai, Claude Desktop, Claude Code, ChatGPT)
    │
    ▼
MCP Client (embedded in the AI platform)
    │  MCP Protocol (stdio or Streamable HTTP)
    ▼
┌─────────────────────────────────────────────┐
│         Ploomes MCP Server                  │
│                                             │
│  ┌─────────┐   ┌───────────┐   ┌────────┐  │
│  │ 43 Tools│──▶│  Ploomes  │──▶│  Rate  │  │
│  │ (Zod    │   │  Client   │   │ Limiter│  │
│  │ schemas)│   │ (fetch)   │   │ (120/m)│  │
│  └─────────┘   └───────────┘   └────────┘  │
│                      │                      │
└──────────────────────│──────────────────────┘
                       │  HTTPS + User-Key header
                       ▼
              https://api2.ploomes.com
```

---

## Component Breakdown

### 1. Entry Point (`src/index.ts`)

Responsible for:
- Loading environment variables via `dotenv`
- Detecting the transport type from `MCP_TRANSPORT` env var
- Starting the server with the appropriate transport

**Transport detection logic:**

```
MCP_TRANSPORT env var
    ├── "http"  → Start HTTP server on MCP_HTTP_PORT (default 3000)
    └── (other) → Start stdio transport (default)
```

### 2. Server (`src/server.ts`)

Creates the `McpServer` instance and registers all 56 tools. This is where:
- The `PloomesClient` is instantiated with credentials from environment
- Tool registration functions from each module are called
- Tools are grouped by priority:
  1. **Core** — Contacts, Deals, Tasks, Pipelines
  2. **Context & Structure** — Interactions, Fields, Users, Account
  3. **Full Coverage** — Quotes, Orders, Products

### 3. HTTP Client (`src/client/ploomes-client.ts`)

Central HTTP client that all tools use. Provides:

| Method | Usage |
|---|---|
| `get<T>(path, params?)` | GET requests with optional OData params |
| `post<T>(path, body?, params?)` | POST for creating entities and actions |
| `patch<T>(path, body, params?)` | PATCH for updating entities |
| `delete(path)` | DELETE for removing entities |

**Request lifecycle:**

```
Tool calls client.get("/Contacts", params)
    │
    ▼
Rate Limiter — acquire slot (wait if at 120 req/min)
    │
    ▼
Build URL with OData query params
    │
    ▼
fetch() with User-Key header
    │
    ├── 2xx → Parse JSON, return data
    ├── 429 → Wait (exponential backoff), retry up to 3x
    ├── 5xx → Wait (exponential backoff), retry up to 3x
    ├── 400 → Throw with error details from body
    ├── 401 → Throw "Authentication failed — check your PLOOMES_USER_KEY"
    ├── 404 → Throw "Resource not found: /path"
    └── Network error → Retry up to 3x, then throw
```

**Exponential backoff schedule:**

| Attempt | Delay |
|---|---|
| 1st retry | 1 second |
| 2nd retry | 2 seconds |
| 3rd retry | 4 seconds |

### 4. Rate Limiter (`src/client/rate-limiter.ts`)

Implements a sliding window algorithm to stay within Ploomes' rate limit (120 requests per minute per account).

**How it works:**

1. Maintains an array of timestamps for recent requests
2. On `acquire()`, prunes timestamps older than 60 seconds
3. If under the limit: records timestamp, returns immediately
4. If at the limit: queues the request, schedules a drain when the oldest timestamp expires
5. Drain processes queued requests as slots become available

```
Timeline (60-second window):
├──────────── 120 requests ─────────────┤
│ req req req ... req                    │ → at limit
│                        ↑ oldest falls off, slot opens
│                        └── queued request proceeds
```

This is fully transparent to the tools — they just `await client.get(...)` and the limiter handles the rest.

### 5. OData Builder (`src/client/odata-builder.ts`)

Converts tool input parameters to OData v4 query string parameters:

```
Input: { filter: "Name eq 'João'", top: 50, skip: 0, expand: "OtherProperties" }
  ↓
Output: { "$filter": "Name eq 'João'", "$top": "50", "$skip": "0", "$expand": "OtherProperties" }
```

Automatically caps `$top` at 300 (Ploomes API maximum).

### 6. Tool Modules (`src/tools/*.ts`)

Each module exports a `register*Tools(server, client)` function that registers tools using `server.registerTool()`. Every tool follows this pattern:

```typescript
server.registerTool(
  "ploomes_{entity}_{action}",    // snake_case name
  {
    title: "Human-Readable Title",
    description: "English description for LLM",
    inputSchema: { /* Zod schema */ },
    annotations: { readOnlyHint, destructiveHint, idempotentHint, openWorldHint }
  },
  async (input) => {
    try {
      // Call client method
      // Return formatted response
    } catch (err) {
      return errorResponse(err);  // Never throws — always returns MCP response
    }
  }
);
```

**Tool annotations guide agent behavior:**

| Annotation | Meaning | Example |
|---|---|---|
| `readOnlyHint: true` | Doesn't modify data | list, get tools |
| `destructiveHint: true` | Deletes data permanently | delete tools |
| `idempotentHint: true` | Same call twice = same result | get, update, delete |
| `openWorldHint: true` | Interacts with external system | All tools (Ploomes API) |

### 7. Response Formatter (`src/utils/formatter.ts`)

Standardizes all tool responses to the MCP format:

```typescript
// Success
{ content: [{ type: "text", text: "..." }] }

// Error
{ content: [{ type: "text", text: "Error: ..." }], isError: true }
```

Provides specialized builders:

| Function | Output format |
|---|---|
| `listResponse("contact", data)` | `"Found 5 contact(s):\n\n[...]"` |
| `createResponse("Deal", data)` | `"Deal created (Id: 123):\n\n{...}"` |
| `updateResponse("Task", 456)` | `"Task 456 updated successfully."` |
| `deleteResponse("Contact", 789)` | `"Contact 789 deleted successfully."` |
| `actionResponse("Deal", 123, "marked as won")` | `"Deal 123 marked as won successfully."` |

### 8. Logger (`src/utils/logger.ts`)

Writes to **stderr** (critical for stdio transport, which uses stdout for MCP protocol messages).

```
[2025-06-15T14:30:00.000Z] [INFO] Ploomes MCP server running via stdio
[2025-06-15T14:30:01.234Z] [DEBUG] GET https://api2.ploomes.com/Contacts?$top=50
[2025-06-15T14:30:02.567Z] [WARN] Ploomes returned 429 on /Contacts. Retrying in 1000ms…
```

Level filtering: `debug` < `info` < `warn` < `error`. Set via `LOG_LEVEL` env var.

---

## Transport Modes

### stdio (Default)

For local use with Claude Desktop and Claude Code. The MCP client spawns the server as a child process and communicates via stdin/stdout.

```
Claude Desktop/Code
    ├── stdin  → sends JSON-RPC requests
    └── stdout ← receives JSON-RPC responses
    (stderr is used for logs)
```

### Streamable HTTP

For remote deployment on a VPS. The server runs as an HTTP server accepting POST requests at `/mcp`.

```
AI Client (Claude.ai / ChatGPT)
    │
    ▼  HTTPS POST /mcp
    │
Reverse Proxy (nginx/caddy with TLS)
    │
    ▼  HTTP POST /mcp
    │
Ploomes MCP Server (127.0.0.1:3000)
```

The HTTP transport is **stateless**: each request creates a new `StreamableHTTPServerTransport` instance with `sessionIdGenerator: undefined` and `enableJsonResponse: true`. This simplifies deployment (no sticky sessions needed).

---

## Data Flow Example

Here's what happens when an AI agent calls `ploomes_contacts_list` with `filter: "Email ne null"`:

```
1. MCP Client sends JSON-RPC request:
   {"method": "tools/call", "params": {"name": "ploomes_contacts_list", "arguments": {"filter": "Email ne null", "top": 50}}}

2. SDK routes to the registered tool handler

3. Tool handler calls buildODataParams({ filter: "Email ne null", top: 50 })
   → { "$filter": "Email ne null", "$top": "50" }

4. Tool handler calls client.get("/Contacts", params)

5. PloomesClient.request():
   a. rateLimiter.acquire() — waits if at 120 req/min
   b. Builds URL: https://api2.ploomes.com/Contacts?$filter=Email+ne+null&$top=50
   c. fetch(url, { headers: { "User-Key": "..." } })
   d. Parse JSON response: { "value": [{Id: 1, Name: "João", ...}, ...] }

6. Tool handler calls listResponse("contact", data)
   → { content: [{ type: "text", text: "Found 3 contact(s):\n\n[...]" }] }

7. SDK sends JSON-RPC response back to client

8. AI agent receives the formatted contact list
```

---

[&larr; Back to README](../README.md) | [Configuration &rarr;](configuration.md)
