# Ploomes MCP Server

Unofficial [Model Context Protocol](https://modelcontextprotocol.io) server that connects AI agents to the [Ploomes CRM](https://www.ploomes.com) REST API. Exposes **43 tools** covering contacts, deals, tasks, pipelines, interactions, quotes, orders, products, fields, users, and account management.

Works with any MCP-compatible client: **Claude Desktop**, **Claude Code**, **Claude.ai** (remote), **ChatGPT** (remote), and others.

---

## Quick Start

### Prerequisites

- **Node.js 20+** (uses native `fetch`)
- A **Ploomes User-Key** (get it from Ploomes > Settings > Integration)

### Install & Build

```bash
git clone https://github.com/your-username/ploomes-mcp-server.git
cd ploomes-mcp-server
npm install
npm run build
```

### Configure

```bash
cp .env.example .env
# Edit .env and set your PLOOMES_USER_KEY
```

### Run

```bash
# stdio transport (default — for Claude Desktop / Claude Code)
PLOOMES_USER_KEY=your_key node dist/index.js

# HTTP transport (for remote access via Claude.ai / ChatGPT)
MCP_TRANSPORT=http PLOOMES_USER_KEY=your_key node dist/index.js
```

---

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | System design, data flow, component breakdown |
| [Configuration](docs/configuration.md) | Environment variables, transport options, deployment |
| [Tools Reference](docs/tools-reference.md) | All 43 tools with parameters, examples, and annotations |
| [Testing & Debugging](docs/testing.md) | MCP Inspector, Claude Desktop, Claude Code setup |
| [Examples & Recipes](docs/examples.md) | Real-world CRM workflows with step-by-step tool calls |

---

## Client Setup

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ploomes": {
      "command": "node",
      "args": ["/absolute/path/to/ploomes-mcp-server/dist/index.js"],
      "env": {
        "PLOOMES_USER_KEY": "your-key-here"
      }
    }
  }
}
```

### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "ploomes": {
      "command": "node",
      "args": ["/absolute/path/to/ploomes-mcp-server/dist/index.js"],
      "env": {
        "PLOOMES_USER_KEY": "your-key-here"
      }
    }
  }
}
```

Or add it via the CLI:

```bash
claude mcp add ploomes node /absolute/path/to/ploomes-mcp-server/dist/index.js \
  -e PLOOMES_USER_KEY=your-key-here
```

### Remote (HTTP Transport)

Start the server with HTTP transport on your VPS:

```bash
MCP_TRANSPORT=http MCP_HTTP_PORT=3000 PLOOMES_USER_KEY=your-key node dist/index.js
```

Then configure your MCP client to connect to `https://your-server.com/mcp` (use a reverse proxy like nginx/caddy for HTTPS).

---

## Tools Overview

| Category | Tools | Operations |
|---|---|---|
| **Contacts** | 5 | list, get, create, update, delete |
| **Deals** | 8 | list, get, create, update, delete, win, lose, reopen |
| **Tasks** | 5 | list, create, update, delete, finish |
| **Pipelines** | 2 | list pipelines, list stages |
| **Interactions** | 4 | list, create, update, delete |
| **Quotes** | 4 | list, create, update, delete |
| **Orders** | 4 | list, create, update, delete |
| **Products** | 4 | list, create, update, delete |
| **Fields** | 1 | list custom fields |
| **Users** | 1 | list users |
| **Account** | 1 | get account info |
| | **43 total** | |

See [Tools Reference](docs/tools-reference.md) for complete documentation of every tool.

---

## Project Structure

```
ploomes-mcp-server/
├── src/
│   ├── index.ts              # Entry point — transport detection (stdio / HTTP)
│   ├── server.ts             # Creates McpServer, registers all tools
│   ├── client/
│   │   ├── rate-limiter.ts   # Sliding window rate limiter (120 req/min)
│   │   ├── odata-builder.ts  # OData v4 query parameter builder
│   │   └── ploomes-client.ts # HTTP client with retry & error handling
│   ├── tools/
│   │   ├── contacts.ts       # 5 tools — CRUD
│   │   ├── deals.ts          # 8 tools — CRUD + Win/Lose/Reopen
│   │   ├── tasks.ts          # 5 tools — CRUD + Finish
│   │   ├── pipelines.ts      # 2 tools — List pipelines & stages
│   │   ├── interactions.ts   # 4 tools — CRUD
│   │   ├── quotes.ts         # 4 tools — CRUD
│   │   ├── orders.ts         # 4 tools — CRUD
│   │   ├── products.ts       # 4 tools — CRUD
│   │   ├── fields.ts         # 1 tool  — List fields
│   │   ├── users.ts          # 1 tool  — List users
│   │   └── account.ts        # 1 tool  — Account info
│   ├── types/
│   │   └── ploomes.ts        # TypeScript interfaces for all entities
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
