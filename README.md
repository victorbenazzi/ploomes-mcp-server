# Ploomes MCP Server

Unofficial [Model Context Protocol](https://modelcontextprotocol.io) server that connects AI agents to the [Ploomes CRM](https://www.ploomes.com) REST API. Exposes **56 tools** covering contacts, deals, tasks, pipelines, interactions, quotes, orders, products, fields, users, account management, and lookup/reference data.

Works with any MCP-compatible client: **Claude Desktop**, **Claude Code**, **Cursor**, **VS Code (Copilot)**, and others.

---

## Quick Start

### One-command setup

```bash
npx ploomes-mcp-server init
```

The interactive wizard will:

1. Ask for your **Ploomes User-Key**
2. Ask **where to install** (Claude Desktop, Claude Code, Cursor, VS Code, or manual)
3. Ask if **project-level or global**
4. Write the config automatically

That's it. No cloning, no building, no manual config editing.

### Prerequisites

- **Node.js 20+** (uses native `fetch`)
- A **Ploomes User-Key** (get it from Ploomes > Settings > Integration > API Key)

---

## Manual Setup

If you prefer to configure manually, add this to your MCP client config:

### Claude Desktop

File: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "ploomes": {
      "command": "npx",
      "args": ["-y", "ploomes-mcp-server"],
      "env": {
        "PLOOMES_USER_KEY": "your-key-here"
      }
    }
  }
}
```

### Claude Code

Project-level `.mcp.json`:

```json
{
  "mcpServers": {
    "ploomes": {
      "command": "npx",
      "args": ["-y", "ploomes-mcp-server"],
      "env": {
        "PLOOMES_USER_KEY": "your-key-here"
      }
    }
  }
}
```

Or via CLI:

```bash
claude mcp add ploomes -- npx -y ploomes-mcp-server -e PLOOMES_USER_KEY=your-key-here
```

### Cursor

File: `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "ploomes": {
      "command": "npx",
      "args": ["-y", "ploomes-mcp-server"],
      "env": {
        "PLOOMES_USER_KEY": "your-key-here"
      }
    }
  }
}
```

### Remote (HTTP Transport)

```bash
MCP_TRANSPORT=http MCP_HTTP_PORT=3000 PLOOMES_USER_KEY=your-key npx ploomes-mcp-server
```

Then point your MCP client to `https://your-server.com/mcp` (use a reverse proxy for HTTPS).

---

## CLI

```bash
npx ploomes-mcp-server              # Start the MCP server (stdio)
npx ploomes-mcp-server init         # Interactive setup wizard
npx ploomes-mcp-server --help       # Show usage
npx ploomes-mcp-server --version    # Show version
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PLOOMES_USER_KEY` | **Yes** | — | Your Ploomes API key |
| `MCP_TRANSPORT` | No | `stdio` | `stdio` or `http` |
| `MCP_HTTP_PORT` | No | `3000` | HTTP port (when using http transport) |
| `PLOOMES_BASE_URL` | No | `https://api2.ploomes.com` | Ploomes API base URL |
| `PLOOMES_RATE_LIMIT` | No | `120` | Max requests per minute |

---

## Tools Overview

### CRUD Tools (44)

| Category | Tools | Operations |
|---|---|---|
| **Contacts** | 5 | list, get, create, update, delete |
| **Deals** | 8 | list, get, create, update, delete, win, lose, reopen |
| **Tasks** | 6 | list, get, create, update, delete, finish |
| **Interactions** | 5 | list, get, create, update, delete |
| **Quotes** | 5 | list, get, create, update, delete |
| **Orders** | 5 | list, get, create, update, delete |
| **Products** | 5 | list, get, create, update, delete |
| **Pipelines** | 2 | list pipelines, list stages |
| **Fields** | 1 | list custom fields |
| **Users** | 1 | list users |
| **Account** | 1 | get account info |

### Lookup Tools (12)

Reference tools for discovering valid IDs, enum values, and dropdown options used by the CRUD tools above.

| Tool | Description |
|---|---|
| `ploomes_contacts_types_list` | Contact types (Person, Company, etc.) |
| `ploomes_contacts_status_list` | Contact statuses (Active, Inactive, etc.) |
| `ploomes_contacts_origins_list` | Contact origins (Website, Referral, etc.) |
| `ploomes_deals_status_list` | Deal statuses (Open, Won, Lost) |
| `ploomes_deals_loss_reasons_list` | Loss reasons for marking deals as lost |
| `ploomes_tasks_types_list` | Task types (Call, Meeting, Email, etc.) |
| `ploomes_currencies_list` | Available currencies |
| `ploomes_fields_entities_list` | Entities that support custom fields |
| `ploomes_fields_types_list` | Custom field data types |
| `ploomes_fields_options_tables_list` | Dropdown option tables |
| `ploomes_fields_options_list` | Options within a dropdown table |
| `ploomes_orders_stages_list` | Order workflow stages |

**Total: 56 tools**

See [Tools Reference](docs/tools-reference.md) for complete documentation of every tool.

---

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | System design, data flow, component breakdown |
| [Configuration](docs/configuration.md) | Environment variables, transport options, deployment |
| [Tools Reference](docs/tools-reference.md) | All 56 tools with parameters, examples, and annotations |
| [Testing & Debugging](docs/testing.md) | MCP Inspector, Claude Desktop, Claude Code setup |
| [Examples & Recipes](docs/examples.md) | Real-world CRM workflows with step-by-step tool calls |

---

## Project Structure

```
ploomes-mcp-server/
├── src/
│   ├── index.ts              # Entry point — CLI routing + transport detection
│   ├── server.ts             # Creates McpServer, registers all tools
│   ├── cli/
│   │   └── setup.ts          # Interactive setup wizard (npx init)
│   ├── client/
│   │   ├── rate-limiter.ts   # Sliding window rate limiter (120 req/min)
│   │   ├── odata-builder.ts  # OData v4 query parameter builder
│   │   └── ploomes-client.ts # HTTP client with retry & error handling
│   ├── tools/
│   │   ├── contacts.ts       # 5 tools — CRUD
│   │   ├── deals.ts          # 8 tools — CRUD + Win/Lose/Reopen
│   │   ├── tasks.ts          # 6 tools — CRUD + Finish
│   │   ├── pipelines.ts      # 2 tools — List pipelines & stages
│   │   ├── interactions.ts   # 5 tools — CRUD
│   │   ├── quotes.ts         # 5 tools — CRUD
│   │   ├── orders.ts         # 5 tools — CRUD
│   │   ├── products.ts       # 5 tools — CRUD
│   │   ├── lookups.ts        # 12 tools — Reference/lookup data
│   │   ├── fields.ts         # 1 tool  — List fields
│   │   ├── users.ts          # 1 tool  — List users
│   │   └── account.ts        # 1 tool  — Account info
│   ├── types/
│   │   ├── ploomes.ts        # TypeScript interfaces for all entities
│   │   └── schemas.ts        # Shared Zod schemas (OtherProperties, etc.)
│   └── utils/
│       ├── formatter.ts      # Standardized MCP response builders
│       └── logger.ts         # stderr logger (debug/info/warn/error)
├── dist/                     # Compiled JavaScript (npm run build)
├── docs/                     # Extended documentation
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## Key Design Decisions

- **Zero unnecessary dependencies** — only `@modelcontextprotocol/sdk`, `zod`, and `dotenv`. Uses Node 20's native `fetch`.
- **TypeScript strict mode** — full type safety, no `any`.
- **Every request rate-limited** — sliding window prevents hitting Ploomes' 120 req/min limit.
- **Automatic retries** — exponential backoff on HTTP 429 (rate limit) and 5xx (server errors), up to 3 retries.
- **Descriptive errors** — `"Resource not found: /Contacts(999)"` instead of `"Error"`.
- **Tool descriptions in English** — optimized for LLM understanding. Data from Ploomes may be in pt-BR.
- **Lookup tools** — dedicated tools for discovering valid IDs (types, statuses, origins, currencies, etc.) so the AI agent can self-serve without guessing.
- **Shared Zod schemas** — `OtherProperties` schema reused across all tools that support custom fields.
- **One-command setup** — `npx ploomes-mcp-server init` configures any supported MCP client.
- **No bundler** — plain `tsc` compilation to `dist/`.

---

## Tech Stack

| Component | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript 5.x (strict mode) |
| MCP SDK | `@modelcontextprotocol/sdk` |
| Validation | `zod` |
| HTTP client | Native `fetch` |
| Build | `tsc` (no bundler) |
| Transport | stdio (local) / Streamable HTTP (remote) |
| Distribution | npm (`npx ploomes-mcp-server`) |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Build and test (`npm run build`)
5. Test with MCP Inspector (see [Testing](docs/testing.md))
6. Submit a pull request

---

## License

MIT
