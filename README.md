# hop

An extensible port proxy + request enhancement CLI tool for local development.

## Features

- Interactive CLI for managing proxy rules
- Multiple port proxying with custom headers
- Environment variable support in headers
- Beautiful terminal UI with colors and animations
- Simple configuration management

## Installation

```bash
npm install -g @miaoosi/hop
```

## Quick Start

### 1. Add a proxy

```bash
hop add
```

Follow the interactive prompts to configure your proxy:

```bash
? Enter local port: 3000
? Enter target URL: https://api.example.com
? Add custom headers? Yes
? Header name: Authorization
? Header value: Bearer $TOKEN
? Add another header? No
✔ Proxy added: 3000 → https://api.example.com
```

### 2. List proxies

```bash
hop list
```

Output:

```bash
┌──────┬──────────────────────────────┬─────────────────────────┐
│ Port │ Target                       │ Headers                 │
├──────┼──────────────────────────────┼─────────────────────────┤
│ 3000 │ https://api.example.com      │ Authorization           │
└──────┴──────────────────────────────┴─────────────────────────┘
```

### 3. Start the proxy server

```bash
hop serve
```

Output:

```bash
✔ Hop proxy server running!

→ 3000 → https://api.example.com

ℹ Press Ctrl+C to stop
```

### 4. Remove a proxy

```bash
hop remove
```

Select the proxy you want to remove from the list.

## Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `hop add` | - | Add a new proxy rule (interactive) |
| `hop list` | `ls` | List all configured proxies |
| `hop remove` | `rm` | Remove a proxy rule (interactive) |
| `hop serve` | `start` | Start the proxy server |

## Environment Variables

You can use environment variables in header values using the `$VARIABLE_NAME` syntax:

```bash
# In your .env file
TOKEN=my-secret-token

# In hop add prompt
? Header value: Bearer $TOKEN
```

The `$TOKEN` will be automatically replaced with the value from your environment.

## Configuration

Hop stores configuration in `~/.hop/config.json`:

```json
{
  "proxies": [
    {
      "port": 3000,
      "target": "https://api.example.com",
      "headers": {
        "Authorization": "Bearer $TOKEN",
        "Cookie": "session=abc123"
      }
    }
  ]
}
```

## Use Cases

- Proxy API requests to add authentication headers
- Test APIs with different headers without modifying code
- Add cookies for local development
- Forward requests to remote servers with custom headers

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
