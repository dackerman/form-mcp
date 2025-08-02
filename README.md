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