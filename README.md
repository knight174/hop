# 🦘 hop

_Smart proxying made simple._

An extensible port proxy and request enhancement CLI tool for local development.

## Features

- **Easy Proxy Management**: Add, list, remove, and edit proxies via interactive CLI.
- **Path-Based Routing**: Forward specific paths to different targets.
- **Path Rewriting**: Rewrite URL paths using regex patterns (e.g., `/api/v1` -> `/v2`).
- **Custom Headers**: Inject custom headers (e.g., Authorization cookies) into requests.
- **CORS Support**: Automatically handles CORS preflight requests.
- **Local HTTPS**: Auto-generated self-signed certificates for local HTTPS support.
- **Project-Level Config**: Automatically detects `hop.json` in your current directory.
- **TUI Dashboard**: Interactive terminal dashboard to monitor requests and responses in real-time.

## Installation

```bash
npm install -g @miaoosi/hop
```

## Quick Start

1.  **Add a proxy**:
    ```bash
    hop add
    ```
    Follow the interactive prompts to configure your proxy. You can enable HTTPS, add path rewrites, and custom headers.

2.  **Start the server**:
    ```bash
    hop serve
    ```
    This will launch the interactive TUI dashboard where you can monitor traffic.

## Commands

- `hop add`: Add a new proxy rule.
- `hop list`: List all configured proxies.
- `hop edit`: Edit an existing proxy (modify target, headers, rewrites, etc.).
- `hop remove`: Remove a proxy.
- `hop serve [names...]`: Start the proxy server(s). If names are provided, only those proxies will start.

## Configuration

`hop` supports both global and project-level configuration.

1.  **Project Config** (Recommended for teams): Create a `hop.json` in your project root. `hop` will prioritize this file if it exists.
2.  **Global Config**: Stored in `~/.hop/config.json`.

### Configuration Format (`hop.json`)

```json
{
  "proxies": [
    {
      "name": "api-server",
      "port": 8080,
      "target": "http://localhost:3000",
      "https": true,
      "pathRewrite": {
        "^/api": ""
      },
      "headers": {
        "Authorization": "Bearer token"
      }
    }
  ]
}
```

## TUI Dashboard

When you run `hop serve`, the terminal will switch to an interactive dashboard:

- **Left Panel**: Real-time list of requests. Use `↑`/`↓` to navigate.
- **Right Panel**: Detailed view of the selected request (Headers, Body).
- **Keys**:
    - `Enter`: View details.
    - `q` / `Ctrl+C`: Exit.

Output:

```bash
┌──────────────┬──────┬─────────────────────────┬──────────────────────┬─────────────────┐
│ Name         │ Port │ Target                  │ Paths                │ Headers         │
├──────────────┼──────┼─────────────────────────┼──────────────────────┼─────────────────┤
│ api-proxy    │ 3000 │ https://api.example.com │ /api/users, /api/... │ Authorization   │
│ auth-service │ 5000 │ https://auth.example.com│ (all)                │ -               │
└──────────────┴──────┴─────────────────────────┴──────────────────────┴─────────────────┘
```

### 3. Edit a proxy

```bash
hop edit
```

Select a proxy and choose which properties to edit (name, port, target, paths, or headers). You can:

- Update individual fields
- Add or remove headers
- Replace all headers
- Clear all headers

### 4. Start the proxy server

**Start all proxies:**

```bash
hop serve
```

**Start specific proxies by name:**

```bash
hop serve api-proxy auth-service
```

Output:

```bash
✔ Hop proxy server running!

✓ Started api-proxy on port 3000 → https://api.example.com (paths: /api/users, /api/posts)
✓ Started auth-service on port 5000 → https://auth.example.com

ℹ Press Ctrl+C to stop
```

### 5. Remove a proxy

```bash
hop remove
```

Select the proxy you want to remove from the list.

### 6. Get help

```bash
hop help
```

## Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `hop add` | - | Add a new proxy rule (interactive) |
| `hop list` | `ls` | List all configured proxies |
| `hop edit` | - | Edit an existing proxy rule (interactive) |
| `hop remove` | `rm` | Remove a proxy rule (interactive) |
| `hop serve [names...]` | `start` | Start proxy servers (all or specific ones) |
| `hop help` | - | Display detailed help information |

## Path Matching

When adding a proxy, you can specify which paths should be proxied:

```bash
? Paths to proxy (comma-separated, leave empty for all): /api/users, /api/posts, /v1/auth
```

**How it works:**

- If paths are specified, only requests matching those paths will be proxied
- Matches exact paths and sub-paths (e.g., `/api/users` matches `/api/users/123`)
- If no paths are specified, all requests are proxied
- Non-matching requests return 404 with a helpful message

**Example:**

```bash
# Only /api/users and /api/posts are proxied
$ curl http://localhost:3000/api/users      # ✓ Proxied
$ curl http://localhost:3000/api/users/123  # ✓ Proxied
$ curl http://localhost:3000/other          # ✗ 404: Path not configured
```

## Configuration

Hop stores configuration in `~/.hop/config.json`:

```json
{
  "proxies": [
    {
      "name": "api-proxy",
      "port": 3000,
      "target": "https://api.example.com",
      "paths": ["/api/users", "/api/posts"],
      "headers": {
        "Authorization": "Bearer your-token-here",
        "Cookie": "session=abc123"
      }
    },
    {
      "name": "auth-service",
      "port": 5000,
      "target": "https://auth.example.com"
    }
  ]
}
```

### CORS Configuration

By default, Hop automatically handles CORS headers by mirroring the client's requested headers. For more control, you can configure CORS settings:

```json
{
  "name": "custom-cors-proxy",
  "port": 3000,
  "target": "https://api.example.com",
  "cors": {
    "allowOrigin": "https://myapp.com",
    "allowHeaders": ["Content-Type", "Authorization", "X-Custom-Header"],
    "allowMethods": ["GET", "POST", "PUT", "DELETE"],
    "allowCredentials": true
  }
}
```

**CORS Options:**

- `allowOrigin` (string, optional): Specific origin to allow. Defaults to the request origin or `*`
- `allowHeaders` (string[] | '*', optional): Array of allowed headers or `'*'` for all. If not specified, automatically mirrors the client's requested headers
- `allowMethods` (string[], optional): Array of allowed HTTP methods. Defaults to `['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']`
- `allowCredentials` (boolean, optional): Whether to allow credentials. Defaults to `true`

> [!NOTE]
> The default behavior (without explicit CORS config) is smart - it automatically allows whatever headers the client requests, making it work seamlessly with any custom headers like `x-csrf-token` without manual configuration.

## Use Cases

- 🔐 **API Development** - Proxy API requests to add authentication headers
- 🧪 **Testing** - Test APIs with different headers without modifying code
- 🍪 **Session Management** - Add cookies for local development
- 🌐 **Remote Development** - Forward requests to remote servers with custom headers
- 🛣️ **Path Routing** - Proxy only specific API endpoints
- 🎯 **Multi-Service** - Run multiple proxies for different microservices

## Examples

### Example 1: API with Authentication

```bash
# Add an API proxy with auth header
hop add
? Proxy name: my-api
? Port: 3000
? Target: https://api.production.com
? Paths: /api/v1/users, /api/v1/products
? Add custom headers? Yes
? Header name: Authorization
? Header value: Bearer your-api-token

# Start the proxy
hop serve my-api

# Make requests
curl http://localhost:3000/api/v1/users  # Proxied with auth header
```

### Example 2: Multiple Services

```bash
# Add multiple proxies
hop add  # Create "users-api" on port 3000
hop add  # Create "orders-api" on port 4000
hop add  # Create "auth-api" on port 5000

# Start all services
hop serve

# Or start only specific services
hop serve users-api orders-api
```

### Example 3: Editing an Existing Proxy

```bash
# Edit a proxy configuration
hop edit
? Select proxy to edit: my-api (port: 3000 → https://api.production.com)
? What would you like to edit? (Press space to select)
  ◉ Port
  ◉ Headers

? New local port: 3001
? How would you like to manage headers? Keep existing and add more
? Header name: X-Custom-Header
? Header value: custom-value
? Add another header? No

✔ Proxy updated: my-api
```

### Example 4: Custom CORS Configuration

For scenarios where you need strict CORS control or want to allow specific origins only:

```json
{
  "name": "secure-api",
  "port": 4000,
  "target": "https://secure-api.example.com",
  "headers": {
    "Authorization": "Bearer secret-token"
  },
  "cors": {
    "allowOrigin": "https://trusted-domain.com",
    "allowHeaders": ["Content-Type", "Authorization", "X-CSRF-Token"],
    "allowMethods": ["GET", "POST"],
    "allowCredentials": true
  }
}
```

This configuration:

- Only allows requests from `https://trusted-domain.com`
- Restricts headers to a specific whitelist
- Only permits GET and POST methods
- Enables credential support for cookies and auth headers

## Development

```bash
# Clone the repository
git clone https://github.com/knight174/hop.git
cd hop

# Install dependencies
npm install

# Build
npm run build

# Run locally
npm run dev
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT
