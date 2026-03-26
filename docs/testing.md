# Testing & Debugging

[&larr; Back to README](../README.md)

---

## Table of Contents

- [MCP Inspector (Primary Testing Tool)](#mcp-inspector)
- [Testing with Claude Desktop](#testing-with-claude-desktop)
- [Testing with Claude Code](#testing-with-claude-code)
- [Testing HTTP Transport](#testing-http-transport)
- [Debugging Common Issues](#debugging-common-issues)

---

## MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is the official graphical tool for testing MCP servers. It lets you browse tools, call them interactively, and inspect responses.

### Quick Start

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

This opens a web UI (usually at `http://localhost:6274`) where you can:

1. See all 43 registered tools
2. Click any tool to see its schema and description
3. Fill in parameters and execute tool calls
4. Inspect the JSON response

### With Environment Variables

The Inspector needs your Ploomes key. Pass it via the `-e` flag:

```bash
npx @modelcontextprotocol/inspector -e PLOOMES_USER_KEY=your-key-here node dist/index.js
```

Or use your `.env` file — since the server loads `dotenv`, just make sure `.env` exists:

```bash
# Make sure .env has PLOOMES_USER_KEY set
npx @modelcontextprotocol/inspector node dist/index.js
```

### With Debug Logging

To see detailed request/response logs in the terminal while using the Inspector:

```bash
npx @modelcontextprotocol/inspector -e PLOOMES_USER_KEY=your-key -e LOG_LEVEL=debug node dist/index.js
```

### Step-by-Step Testing Walkthrough

#### 1. Verify Connection

After opening the Inspector:
- You should see all tools listed in the left panel
- Each tool shows its name, title, and description
- If no tools appear, check the terminal for error messages

#### 2. Test a Read-Only Tool First

Start with `ploomes_account_info` — it takes no parameters:

1. Click `ploomes_account_info` in the tool list
2. Click **"Call Tool"**
3. You should see your account info as JSON

If this works, your User-Key is valid and the connection is good.

#### 3. Test Listing with Filters

Try `ploomes_contacts_list`:

1. Click the tool
2. Set `top` to `5` (small page for testing)
3. Click **"Call Tool"**
4. You should see up to 5 contacts as JSON

Then try with a filter:

1. Set `filter` to `Email ne null`
2. Set `select` to `Id,Name,Email`
3. Click **"Call Tool"**
4. Only contacts with emails should appear, with only the selected fields

#### 4. Test Create / Update / Delete Cycle

```
1. ploomes_contacts_create
   → Name: "MCP Test Contact"
   → Email: "test@example.com"
   → Note the returned Id (e.g., 12345)

2. ploomes_contacts_get
   → id: 12345
   → Verify the contact data

3. ploomes_contacts_update
   → id: 12345
   → Note: "Updated via MCP Inspector"

4. ploomes_contacts_get
   → id: 12345
   → Verify the Note was updated

5. ploomes_contacts_delete
   → id: 12345
   → Confirm deletion message
```

#### 5. Test Deal Workflow

```
1. ploomes_pipelines_list → Note a pipeline ID
2. ploomes_stages_list with filter: "PipelineId eq <id>" → Note stage IDs
3. ploomes_deals_create with Title, ContactId, StageId, Amount
4. ploomes_deals_update → Move to next StageId
5. ploomes_deals_win → Mark as won
6. ploomes_deals_reopen → Reopen it
7. ploomes_deals_delete → Clean up
```

---

## Testing with Claude Desktop

### Setup

1. Build the project: `npm run build`
2. Edit `claude_desktop_config.json` (see [Configuration](configuration.md))
3. Restart Claude Desktop

### Verification

Open Claude Desktop and try these prompts:

> "List my Ploomes contacts"

Claude should call `ploomes_contacts_list` and show the results.

> "Create a contact named 'Test Company' with email test@example.com"

Claude should call `ploomes_contacts_create`.

> "Show me the deals for contact ID 123"

Claude should call `ploomes_deals_list` with `filter: "ContactId eq 123"`.

### Debugging

If tools don't appear in Claude Desktop:

1. Check the Claude Desktop logs:
   - **macOS:** `~/Library/Logs/Claude/mcp*.log`
   - **Windows:** `%APPDATA%\Claude\Logs\mcp*.log`

2. Verify the config path is absolute (not relative)

3. Test the server manually first:
   ```bash
   PLOOMES_USER_KEY=your-key node dist/index.js
   # Should show: [INFO] Ploomes MCP server running via stdio
   # Press Ctrl+C to stop
   ```

4. Check for JSON syntax errors in `claude_desktop_config.json`

---

## Testing with Claude Code

### Setup

```bash
# Option 1: Add via CLI
claude mcp add ploomes node /path/to/ploomes-mcp-server/dist/index.js \
  -e PLOOMES_USER_KEY=your-key

# Option 2: Create .mcp.json in project root
```

### Verification

In a Claude Code session:

```
> List all Ploomes pipelines and their stages

> Find contacts whose name contains "Tech"

> Create a task for deal 123: "Follow up with client" due tomorrow
```

### Checking MCP Server Status

In Claude Code, use:

```
/mcp
```

This shows connected MCP servers and their status. The `ploomes` server should appear as connected with its tools listed.

---

## Testing HTTP Transport

### Start the Server

```bash
MCP_TRANSPORT=http MCP_HTTP_PORT=3000 PLOOMES_USER_KEY=your-key LOG_LEVEL=debug node dist/index.js
```

You should see:
```
[INFO] Ploomes MCP server running on http://127.0.0.1:3000/mcp
```

### Test with curl

Send a JSON-RPC request to list tools:

```bash
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

Call a tool:

```bash
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "ploomes_account_info",
      "arguments": {}
    }
  }'
```

List contacts with a filter:

```bash
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "ploomes_contacts_list",
      "arguments": {
        "top": 5,
        "select": "Id,Name,Email"
      }
    }
  }'
```

### Test with MCP Inspector (HTTP mode)

```bash
npx @modelcontextprotocol/inspector --transport http http://127.0.0.1:3000/mcp
```

---

## Debugging Common Issues

### "PLOOMES_USER_KEY environment variable is required"

The server can't find the User-Key. Make sure it's set:

```bash
# Check if it's set
echo $PLOOMES_USER_KEY

# Set it inline
PLOOMES_USER_KEY=your-key node dist/index.js

# Or in .env file
echo "PLOOMES_USER_KEY=your-key" >> .env
```

### "Authentication failed — check your PLOOMES_USER_KEY"

The key is being sent but Ploomes rejects it (HTTP 401). Verify:

1. The key is correct (copy it fresh from Ploomes > Settings > Integration)
2. The key hasn't been revoked
3. There are no extra spaces or newlines in the key

### "Rate limit exceeded"

The server handles this automatically with retries, but if you're seeing frequent rate limit warnings:

1. Lower `PLOOMES_RATE_LIMIT` if other integrations share the quota
2. Reduce `top` values in list calls to lower request count
3. Use `select` to reduce response payload size

### Tools Don't Appear in Client

1. **Build first:** Run `npm run build` — clients use the compiled `dist/index.js`
2. **Absolute paths:** Use absolute paths in client configs, not relative
3. **Restart client:** Claude Desktop requires a restart after config changes
4. **Check logs:** Run with `LOG_LEVEL=debug` to see what's happening

### "Resource not found: /Contacts(999)"

The entity ID doesn't exist in Ploomes. Verify the ID with a list call first.

### Network Errors / Timeouts

The server retries automatically up to 3 times with exponential backoff (1s, 2s, 4s). If errors persist:

1. Check your internet connection
2. Verify `PLOOMES_BASE_URL` is correct (default: `https://api2.ploomes.com`)
3. Check if Ploomes API is experiencing downtime

### Server Starts But No Output

On stdio transport, all logs go to **stderr** (not stdout). This is by design — stdout is reserved for MCP protocol messages. To see logs:

```bash
# Redirect stderr to see logs
PLOOMES_USER_KEY=your-key node dist/index.js 2>server.log

# Or watch logs in real-time
PLOOMES_USER_KEY=your-key node dist/index.js 2>&1 | tee server.log
```

---

[&larr; Back to README](../README.md) | [Examples &rarr;](examples.md)
