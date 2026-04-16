# Configuration

[&larr; Back to README](../README.md)

---

## Environment Variables

All configuration is done via environment variables. Copy `.env.example` to `.env` and adjust:

```bash
cp .env.example .env
```

### Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `PLOOMES_USER_KEY` | **Yes** | — | Your Ploomes API key. Get it from Ploomes > Settings > Integration. |
| `PLOOMES_BASE_URL` | No | `https://api2.ploomes.com` | Ploomes API base URL. Only change if using a custom endpoint. |
| `PLOOMES_RATE_LIMIT` | No | `120` | Max requests per minute. Ploomes allows 120 per account. Lower this if sharing the quota with other integrations. |
| `MCP_TRANSPORT` | No | `stdio` | Transport mode: `stdio` for local use, `http` for remote deployment. |
| `MCP_HTTP_PORT` | No | `3000` | HTTP server port (only used when `MCP_TRANSPORT=http`). |
| `LOG_LEVEL` | No | `info` | Logging verbosity: `debug`, `info`, `warn`, or `error`. |

### Example `.env` file

```env
# Required
PLOOMES_USER_KEY=5A8F3B2C-1D4E-6F7A-9B0C-2E3D4F5A6B7C

# Optional — defaults shown
PLOOMES_BASE_URL=https://api2.ploomes.com
PLOOMES_RATE_LIMIT=120
MCP_TRANSPORT=stdio
MCP_HTTP_PORT=3000
LOG_LEVEL=info
```

---

## Getting Your Ploomes User-Key

1. Log in to [Ploomes](https://app.ploomes.com)
2. Go to **Settings** (gear icon) > **Integration**
3. Copy your **User-Key** (it looks like a UUID: `5A8F3B2C-1D4E-...`)
4. Set it as the `PLOOMES_USER_KEY` environment variable

> **Security note:** The User-Key grants full API access to your Ploomes account. Never commit it to version control. Use environment variables or secrets managers.

---

## Transport Modes

### stdio (Local — Default)

Best for: Claude Desktop, Claude Code, and other local MCP clients.

The client spawns the server as a subprocess and communicates via stdin/stdout. No network configuration needed.

```bash
# Just run it — stdio is the default
PLOOMES_USER_KEY=your_key node dist/index.js
```

Or set in `.env`:
```env
MCP_TRANSPORT=stdio
```

### Streamable HTTP (Remote)

Best for: Claude.ai, ChatGPT, and other remote/browser-based MCP clients.

The server starts an HTTP server that accepts POST requests at `/mcp`.

```bash
MCP_TRANSPORT=http MCP_HTTP_PORT=3000 PLOOMES_USER_KEY=your_key node dist/index.js
```

The server binds to `127.0.0.1` (localhost only). For production, use a reverse proxy with HTTPS:

#### nginx Example

```nginx
server {
    listen 443 ssl;
    server_name mcp.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/mcp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.yourdomain.com/privkey.pem;

    location /mcp {
        proxy_pass http://127.0.0.1:3000/mcp;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Caddy Example

```
mcp.yourdomain.com {
    reverse_proxy /mcp 127.0.0.1:3000
}
```

---

## Client Configuration

### Claude Desktop

Edit `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

**macOS / Linux:**

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

**Windows:**

```json
{
  "mcpServers": {
    "ploomes": {
      "command": "npx.cmd",
      "args": ["-y", "ploomes-mcp-server"],
      "env": {
        "PLOOMES_USER_KEY": "your-key-here"
      }
    }
  }
}
```

> **Why `npx.cmd`?** On Windows, MCP clients spawn processes directly without a shell. Since `npx` is a `.cmd` wrapper on Windows, the extension must be explicit. The `npx ploomes-mcp-server init` wizard handles this automatically.

Restart Claude Desktop after editing. You should see the Ploomes tools appear in the tool picker.

### Claude Code

**Option A — Project-level config** (recommended for teams):

Create `.mcp.json` in your project root:

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

**Option B — CLI command:**

```bash
claude mcp add ploomes -- npx -y ploomes-mcp-server -e PLOOMES_USER_KEY=your-key-here
```

### Cursor

Edit `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

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

### VS Code (Copilot)

Create `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "ploomes": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "ploomes-mcp-server"],
      "env": {
        "PLOOMES_USER_KEY": "your-key-here"
      }
    }
  }
}
```

> **Note:** VS Code uses `"servers"` as the top-level key, not `"mcpServers"` like other clients.

### Remote Clients (Claude.ai, ChatGPT)

After deploying with HTTP transport and a reverse proxy:

1. Get your server URL: `https://mcp.yourdomain.com/mcp`
2. Add as a remote MCP server in your client's settings
3. The client will POST JSON-RPC requests to that endpoint

> **Windows users:** In all JSON examples above (except VS Code), replace `"npx"` with `"npx.cmd"`. The `npx ploomes-mcp-server init` wizard handles this automatically.

---

## Rate Limit Configuration

Ploomes allows **120 requests per minute per account** (shared across all users and integrations).

The built-in rate limiter uses a sliding window to stay within this limit:

```env
# Default: uses the full 120 req/min quota
PLOOMES_RATE_LIMIT=120

# Conservative: if you have other integrations sharing the quota
PLOOMES_RATE_LIMIT=60

# Aggressive: if this is the only integration on the account
PLOOMES_RATE_LIMIT=120
```

When the limit is reached, requests are queued automatically. The AI agent won't see an error — the request just takes longer to complete.

---

## Log Levels

| Level | What it shows |
|---|---|
| `debug` | Every HTTP request URL, response parsing, rate limiter state |
| `info` | Server startup, transport mode (default) |
| `warn` | Rate limit retries, 5xx retries, network errors being retried |
| `error` | Fatal errors, unrecoverable failures |

Logs go to **stderr** (not stdout), so they don't interfere with the MCP protocol on stdio transport.

```bash
# See everything (useful for debugging)
LOG_LEVEL=debug PLOOMES_USER_KEY=your_key node dist/index.js

# Production (only warnings and errors)
LOG_LEVEL=warn PLOOMES_USER_KEY=your_key node dist/index.js
```

---

## Running with Process Managers

### systemd (Linux VPS)

Create `/etc/systemd/system/ploomes-mcp.service`:

```ini
[Unit]
Description=Ploomes MCP Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/ploomes-mcp-server
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
Environment=PLOOMES_USER_KEY=your-key-here
Environment=MCP_TRANSPORT=http
Environment=MCP_HTTP_PORT=3000
Environment=LOG_LEVEL=info

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ploomes-mcp
sudo systemctl start ploomes-mcp
sudo journalctl -u ploomes-mcp -f   # view logs
```

### pm2

```bash
pm2 start dist/index.js --name ploomes-mcp \
  --env MCP_TRANSPORT=http \
  --env MCP_HTTP_PORT=3000 \
  --env PLOOMES_USER_KEY=your-key

pm2 save
pm2 startup
```

---

[&larr; Back to README](../README.md) | [Tools Reference &rarr;](tools-reference.md)
