# MCP Form Server

An MCP (Model Context Protocol) server that allows LLMs to create HTML forms, have users fill them out, and retrieve the responses.

## Features

- **Create Forms**: LLMs can create forms using JSON schema definitions
- **Collect Responses**: Users fill out forms via web interface
- **Retrieve Data**: LLMs can retrieve submitted form responses
- **Persistent Storage**: Forms and responses are saved to disk
- **Professional UI**: Clean, responsive form interface
- **Validation**: Client and server-side form validation
- **Security**: CSRF protection and input sanitization

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the TypeScript code:
   ```bash
   npm run build
   ```

## Usage

### Running the Server

```bash
npm start
```

Or for development:
```bash
npm run dev
```

### Environment Variables

- `MCP_FORM_PORT`: Port for the HTTP server (default: 3000)
- `MCP_HOSTNAME`: Base URL for form links (default: `http://localhost:PORT`)

### MCP Tools

The server provides two MCP tools:

#### `createForm`

Creates a new form and returns its ID and URL.

**Input Schema:**
```json
{
  "schema": {
    "title": "Contact Form",
    "description": "Please fill out your contact information",
    "fields": [
      {
        "id": "name",
        "label": "Full Name",
        "type": "text",
        "required": true
      },
      {
        "id": "email",
        "label": "Email Address",
        "type": "text",
        "required": true
      },
      {
        "id": "subject",
        "label": "Subject",
        "type": "select",
        "required": true,
        "options": ["General Inquiry", "Support", "Sales"]
      },
      {
        "id": "message",
        "label": "Message",
        "type": "textarea",
        "required": true
      }
    ]
  }
}
```

**Response:**
```json
{
  "formId": "abc-123-def",
  "url": "http://localhost:3000/forms/abc-123-def"
}
```

#### `getResponses`

Retrieves the submission status and responses for a form.

**Input:**
```json
{
  "formId": "abc-123-def"
}
```

**Response:**
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

### Form Field Types

- **text**: Single-line text input
- **textarea**: Multi-line text area
- **select**: Dropdown selection
- **radio**: Single choice from options
- **checkbox**: Multiple choice from options

### Example Usage Flow

1. LLM calls `createForm` with a schema
2. Server creates form and returns URL
3. User visits URL and fills out form
4. User submits form (can only submit once)
5. LLM calls `getResponses` to retrieve the data

## Technical Details

### Architecture

- **MCP Server**: Communicates via stdio transport
- **HTTP Server**: Express.js server for form rendering
- **Storage**: In-memory Map with JSON file persistence
- **Security**: CSRF tokens, input validation, HTML escaping

### File Structure

```
mcp-form-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── http-server.ts    # Express server
│   ├── storage.ts        # Data persistence
│   ├── form-generator.ts # HTML generation
│   └── types.ts          # TypeScript interfaces
├── forms.json            # Persistent storage (created at runtime)
└── README.md
```

### Data Persistence

Forms are stored in memory and persisted to `forms.json`. The server:
- Loads existing forms on startup
- Saves to disk on every form update
- Handles graceful shutdown (SIGTERM/SIGINT)

### Security Features

- CSRF protection using form ID as token
- HTML escaping to prevent XSS
- Input validation on both client and server
- Required field enforcement

## Connecting to MCP Clients

### Claude Desktop

1. **Open Configuration**:
   - Open Claude Desktop Settings
   - Navigate to "Developer" tab
   - Click "Edit Config" to open the configuration file

2. **Configuration File Location**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

3. **Add Server Configuration**:
   ```json
   {
     "mcpServers": {
       "form-server": {
         "command": "node",
         "args": ["/path/to/form-mcp/dist/index.js"],
         "env": {
           "MCP_FORM_PORT": "3000"
         }
       }
     }
   }
   ```

4. **Restart Claude Desktop** to load the new configuration

### Cursor

[![Add to Cursor](https://cursor.directory/api/badge/mcp)](https://cursor.directory/mcp/form-mcp)

1. **Open MCP Settings**:
   - Open command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
   - Search for "Cursor Settings"
   - Navigate to Features → Model Context Protocol

2. **Configuration Options**:
   
   **Global Configuration** (`~/.cursor/mcp.json`):
   ```json
   {
     "mcpServers": {
       "form-server": {
         "command": "node",
         "args": ["/path/to/form-mcp/dist/index.js"],
         "env": {
           "MCP_FORM_PORT": "3000"
         }
       }
     }
   }
   ```
   
   **Project-Specific Configuration** (`.cursor/mcp.json` in project root):
   ```json
   {
     "mcpServers": {
       "form-server": {
         "command": "node",
         "args": ["./dist/index.js"],
         "env": {
           "MCP_FORM_PORT": "3000"
         }
       }
     }
   }
   ```

3. **Enable the Server**:
   - Toggle the server on in MCP settings
   - Look for a green dot indicating successful connection

### LibreChat

For LibreChat, configure the MCP server with a custom hostname:

```json
{
  "mcpServers": {
    "form-server": {
      "command": "node",
      "args": ["/path/to/form-mcp/dist/index.js"],
      "env": {
        "MCP_FORM_PORT": "3000",
        "MCP_HOSTNAME": "http://homoiconicity.tail663e6.ts.net:3000"
      }
    }
  }
}
```

The `MCP_HOSTNAME` environment variable allows you to specify the full URL that will be used in form links, which is particularly useful when:
- Running behind a reverse proxy
- Using a custom domain or subdomain
- Accessing the server from a different network

### Other MCP Clients

For other MCP-compatible clients, use this general configuration:

```json
{
  "mcpServers": {
    "form-server": {
      "command": "node",
      "args": ["/absolute/path/to/form-mcp/dist/index.js"],
      "env": {
        "MCP_FORM_PORT": "3000"
      }
    }
  }
}
```

### Prerequisites

- Node.js installed on your system
- Form MCP server built (`npm run build`)
- Absolute path to the compiled server (`dist/index.js`)

### Troubleshooting

- **Server not connecting**: Ensure the path to `dist/index.js` is correct and absolute
- **Port conflicts**: Change `MCP_FORM_PORT` if port 3000 is in use
- **Permission issues**: Ensure the MCP client has permission to execute Node.js
- **Build errors**: Run `npm run build` to ensure the TypeScript is compiled

## Docker Deployment

### Quick Start with Docker

1. **Build and run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

2. **Access the server**:
   - HTTP endpoint: `http://localhost:3000`
   - Health check: `http://localhost:3000/health`

### Docker Configuration

The Docker setup includes:
- Node.js 20 Alpine base image
- Automatic TypeScript compilation
- Health checks
- Persistent data volume
- Automatic restart on failure

### Manual Docker Commands

```bash
# Build the image
docker build -t form-mcp .

# Run the container
docker run -d \
  --name form-mcp-server \
  -p 3000:3000 \
  -v $(pwd)/forms.json:/app/forms.json \
  -v $(pwd)/data:/data \
  --restart unless-stopped \
  form-mcp
```

### Autostart on System Boot

#### Using systemd (Linux)

1. **Copy the service file**:
   ```bash
   sudo cp systemd/form-mcp.service /etc/systemd/system/
   ```

2. **Update the WorkingDirectory path**:
   ```bash
   sudo sed -i 's|/path/to/form-mcp|'$(pwd)'|g' /etc/systemd/system/form-mcp.service
   ```

3. **Enable and start the service**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable form-mcp.service
   sudo systemctl start form-mcp.service
   ```

4. **Check service status**:
   ```bash
   sudo systemctl status form-mcp.service
   ```

#### Using Docker restart policy

The `docker-compose.yml` includes `restart: unless-stopped` which will:
- Automatically restart the container if it crashes
- Start the container on system boot (if Docker daemon starts on boot)
- Keep the container stopped if you manually stop it

### Data Persistence

Form data is persisted in two locations:
- `./forms.json`: Main form storage file
- `./data/`: Additional data directory

These are mounted as volumes to survive container restarts.

### Updating the Container

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### Container Logs

```bash
# View logs
docker-compose logs -f

# View last 100 lines
docker-compose logs --tail=100
```

## Development

### Building

```bash
npm run build
```

### Running in Development

```bash
npm run dev
```

### Cleaning Build Files

```bash
npm run clean
```

## License

MIT