# Form MCP Server


A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that enables AI assistants to create HTML forms, collect user responses, and retrieve submission data. Perfect for gathering structured information from users during AI conversations.

## Example
Here, an LLM has called the tool to generate a product feedback 
<img width="888" height="727" alt="image" src="https://github.com/user-attachments/assets/efdd7cb1-2cd9-4f04-8db4-49a0eaa279c8" />

Here's the resulting form that is rendered for the user to fill out.
<img width="716" height="1341" alt="Rendered form" src="https://github.com/user-attachments/assets/c9904b4f-b16f-4eb7-9c22-f7550309ec44" />

After submitting and telling the LLM it is done, the LLM can retrieve the info in a convenient JSON format.
<img width="927" height="694" alt="Resulting response" src="https://github.com/user-attachments/assets/c2fabc98-bd04-4ba4-9819-33d3e8348214" />

## What It Does

- **🎯 Create Forms**: AI assistants can generate custom HTML forms with various field types
- **📝 Collect Responses**: Users fill out forms through a clean web interface  
- **📊 Retrieve Data**: AI assistants can check for submissions and access response data
- **💾 Persistent Storage**: Forms and responses are automatically saved
- **🔒 Secure**: CSRF protection and input validation included

## Quick Start

### Installation & Setup

#### Option 1: Docker (Recommended)
Start the server with Docker Compose:
```bash
git clone https://github.com/yourusername/form-mcp.git
cd form-mcp
docker compose up -d
```

This starts the server listening on:
- **Port 3000**: Form HTTP server (for rendering forms)
- **Port 3002**: MCP streamable HTTP endpoint

#### Option 2: Native pnpm
Run the server locally with Node.js:
```bash
git clone https://github.com/yourusername/form-mcp.git
cd form-mcp
pnpm install
pnpm build

# Start with streamable HTTP transport
MCP_TRANSPORT=streamable-http MCP_HTTP_PORT=3002 MCP_FORM_PORT=3000 pnpm start
```

The server will be available at `http://localhost:3002/mcp` for MCP connections.

### Connect MCP Clients

#### Claude Code (Official CLI)
Add the server using the command line:
```bash
# For Docker setup
claude mcp add --transport http form-mcp http://localhost:3002/mcp

# For local pnpm setup  
claude mcp add --transport http form-mcp http://localhost:3002/mcp
```

You can also set the scope to make it available across projects:
```bash
claude mcp add --transport http -s user form-mcp http://localhost:3002/mcp
```

#### Claude Desktop (Legacy stdio mode)
Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "form-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/form-mcp/dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio"
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
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

**Note**: Cursor currently has limited streamable HTTP support. Use stdio mode for now.

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

### For Clients Without Streamable HTTP Support

If your MCP client doesn't support streamable HTTP yet, use the `mcp-remote` adapter:

#### Install mcp-remote
```bash
npm install -g mcp-remote
```

#### Configure your client
Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "form-mcp": {
      "command": "mcp-remote",
      "args": ["http://localhost:3002/mcp"]
    }
  }
}
```

This allows any MCP client to connect to the streamable HTTP server through a local stdio bridge.

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
| `MCP_TRANSPORT` | `stdio` | Transport mode: `stdio` or `streamable-http` |
| `MCP_HTTP_PORT` | `3002` | Port for MCP streamable HTTP endpoint |
| `MCP_FORM_PORT` | `3000` | Port for the form HTTP server |
| `MCP_HOSTNAME` | `http://localhost:3000` | Base URL for form links |
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
