# MCP configuration (Cursor + LibreChat)

Daemon uses ClickHouse for datasets. Separate credentials apply to **SQL/datasets**, **Cloud management API**, and **remote MCP**.

## ClickHouse Cloud API keys (management API)

Admin keys live in **`clickhouse-api-key-daemon-admin.txt`** (gitignored). Copy into **`.env`**:

| Variable | Purpose |
|----------|---------|
| `CLICKHOUSE_CLOUD_KEY_ID` | Key ID from Cloud console |
| `CLICKHOUSE_CLOUD_KEY_SECRET` | Key secret (shown once at creation) |
| `CLICKHOUSE_CLOUD_API_URL` | Default `https://api.clickhouse.cloud/v1` |

Auth is **HTTP Basic** (`Key ID` : `Key Secret`). Example:

```bash
curl --user "$CLICKHOUSE_CLOUD_KEY_ID:$CLICKHOUSE_CLOUD_KEY_SECRET" \
  "$CLICKHOUSE_CLOUD_API_URL/organizations"
```

Docs: [Managing API Keys](https://clickhouse.com/docs/cloud/manage/openapi)

These keys are **not** substituted into `.cursor/mcp.json` (never commit secrets). They do **not** replace MCP OAuth on `https://mcp.clickhouse.cloud/mcp`.

## ClickHouse Cloud (remote MCP)

**Endpoint:** `https://mcp.clickhouse.cloud/mcp`

**Prerequisites**

1. A running [ClickHouse Cloud](https://clickhouse.com/cloud) service.
2. In the Cloud console: **Connect** → **Connect with MCP** → enable MCP.

**ClickHouse docs:** [Enable remote MCP server](https://clickhouse.com/docs/use-cases/AI/MCP/remote_mcp)

### Cursor

Project file: [`.cursor/mcp.json`](../../.cursor/mcp.json)

```json
{
  "mcpServers": {
    "clickhouse-cloud": {
      "url": "https://mcp.clickhouse.cloud/mcp",
      "headers": {}
    }
  }
}
```

Reload MCP in **Cursor Settings → MCP** (or restart Cursor). Complete **OAuth** when prompted on first use.

### LibreChat

Copy the snippet from [`config/librechat.mcp-servers.example.yaml`](../../config/librechat.mcp-servers.example.yaml) into your `librechat.yaml`:

```yaml
mcpServers:
  clickhouse-cloud:
    type: streamable-http
    url: https://mcp.clickhouse.cloud/mcp
    initTimeout: 150000
```

Restart LibreChat after changes. Use the MCP panel or chat dropdown to **Authenticate** (OAuth). Callback URL pattern:

`${baseUrl}/api/mcp/clickhouse-cloud/oauth/callback`

**LibreChat docs:** [MCP basic configuration](https://www.librechat.ai/docs/features/mcp#basic-configuration)

## Local ClickHouse (dev stack)

For `make up` / `CLICKHOUSE_DSN` in [`.env.example`](../../.env.example), use the open-source [mcp-clickhouse](https://github.com/ClickHouse/mcp-clickhouse) server (stdio), not the Cloud remote URL.

Example LibreChat stdio block (adjust host/credentials to match your compose):

```yaml
mcpServers:
  clickhouse-local:
    command: uvx
    args: ["mcp-clickhouse"]
    env:
      CLICKHOUSE_HOST: localhost
      CLICKHOUSE_PORT: "8123"
      CLICKHOUSE_USER: daemon
      CLICKHOUSE_PASSWORD: daemon
      CLICKHOUSE_SECURE: "false"
```

Do not commit API keys; use `customUserVars` or env vars on the LibreChat host per [MCP servers configuration](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/mcp_servers).
