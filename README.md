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