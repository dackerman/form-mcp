# Form MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that enables AI assistants to create HTML forms, collect user responses, and retrieve submission data. Perfect for gathering structured information from users during AI conversations.

## What It Does

- **🎯 Create Forms**: AI assistants can generate custom HTML forms with various field types
- **📝 Collect Responses**: Users fill out forms through a clean web interface  
- **📊 Retrieve Data**: AI assistants can check for submissions and access response data
- **💾 Persistent Storage**: Forms and responses are automatically saved
- **🔒 Secure**: CSRF protection and input validation included

## Quick Start

### Installation

1. **Install with pnpm** (recommended):
   ```bash
   git clone https://github.com/yourusername/form-mcp.git
   cd form-mcp
   pnpm install
   pnpm build
   ```

2. **Or with Docker**:
   ```bash
   git clone https://github.com/yourusername/form-mcp.git
   cd form-mcp
   docker compose up -d
   ```

### Configure Your AI Assistant

#### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "form-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/form-mcp/dist/index.js"],
      "env": {
        "MCP_PORT": "3000"
      }
    }
  }
}
```

**Config file locations:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

#### Cursor

Add to `.cursor/mcp.json` or global `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "form-mcp": {
      "command": "node", 
      "args": ["/absolute/path/to/form-mcp/dist/index.js"],
      "env": {
        "MCP_PORT": "3000"
      }
    }
  }
}
```

#### LibreChat

Add to `librechat.yaml`:

```yaml
mcpServers:
  form-mcp:
    type: streamable-http
    url: http://form-mcp:3002/mcp
    timeout: 60000
    serverInstructions: |
      This server allows you to create HTML forms for users to fill out.
      Use createForm to generate forms with various field types.
      Use getResponses to check for submissions and retrieve data.
```

## How It Works

### 1. AI Creates a Form

The AI assistant uses the `createForm` tool with a schema:

```
Create a contact form with name, email, subject dropdown, and message fields.
```

### 2. User Fills Out Form

The AI provides a URL like `http://localhost:3000/forms/abc-123` where users can:
- Fill out the form fields
- Submit once (forms lock after submission)
- See a confirmation message

### 3. AI Retrieves Responses

The AI uses `getResponses` to check if the form was submitted and get the data:

```json
{
  "submitted": true,
  "responses": {
    "name": "John Doe",
    "email": "john@example.com", 
    "subject": "General Inquiry",
    "message": "Hello, I have a question..."
  }
}
```

## Supported Form Fields

| Field Type | Description | Example Use |
|------------|-------------|-------------|
| `text` | Single-line text input | Names, titles, short answers |
| `email` | Email input with validation | Email addresses |
| `textarea` | Multi-line text area | Messages, descriptions, feedback |
| `select` | Dropdown menu | Categories, options, preferences |
| `radio` | Single choice from options | Yes/No, ratings, single selection |
| `checkbox` | Multiple choice from options | Features, interests, multiple selection |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_PORT` | `3000` | Port for the form server |
| `MCP_HOSTNAME` | `localhost` | Hostname for form URLs |
| `NODE_ENV` | `development` | Environment mode |

## Deployment Options

### Docker (Recommended)

```bash
# Start the server
docker compose up -d

# View logs
docker compose logs -f

# Stop the server
docker compose down
```

The server will be available at `http://localhost:3000` with persistent data storage.

### Native Node.js

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

### Autostart on Boot (Linux)

```bash
# Copy systemd service file
sudo cp systemd/form-mcp.service /etc/systemd/system/

# Update paths in the service file
sudo nano /etc/systemd/system/form-mcp.service

# Enable and start
sudo systemctl enable form-mcp.service
sudo systemctl start form-mcp.service
```

## Example Use Cases

### Customer Feedback Form
```
Create a feedback form with rating (1-5 radio buttons), category dropdown (Bug Report, Feature Request, General), and comment textarea.
```

### Event Registration
```
Create an event registration form with name, email, dietary restrictions (checkboxes), and special requests textarea.
```

### Survey Collection
```
Create a product survey with satisfaction rating, feature preferences (multiple checkboxes), and improvement suggestions.
```

## Troubleshooting

### Server Won't Start
- Check that Node.js 18+ is installed
- Ensure port 3000 is available (`lsof -i :3000`)
- Verify the build completed successfully (`pnpm build`)

### MCP Client Connection Issues
- Use absolute paths in configuration files
- Restart your AI assistant after config changes
- Check that the server process is running
- Verify file permissions on the dist/index.js file

### Forms Not Loading
- Check the server logs for errors
- Ensure the hostname is accessible from your browser
- Verify the forms.json file has proper permissions

### Docker Issues
- Run `docker compose logs` to see error messages
- Ensure Docker daemon is running
- Check for port conflicts with `docker ps`

## Getting Help

- **Documentation**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- **Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guide
- **Issues**: Report bugs and request features on GitHub
- **MCP Resources**: Visit [modelcontextprotocol.io](https://modelcontextprotocol.io/) for MCP documentation

## License

MIT License - see [LICENSE](./LICENSE) for details.