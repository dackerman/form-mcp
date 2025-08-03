# Form MCP Server Architecture

This document provides a detailed technical overview of the Form MCP Server architecture, implementation details, and design decisions.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [MCP Protocol Implementation](#mcp-protocol-implementation)
- [HTTP Server Architecture](#http-server-architecture)
- [Data Flow](#data-flow)
- [Storage Layer](#storage-layer)
- [Security Model](#security-model)
- [Transport Mechanisms](#transport-mechanisms)
- [Form Generation Engine](#form-generation-engine)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)
- [Deployment Architecture](#deployment-architecture)

## Overview

The Form MCP Server is a dual-purpose application that:

1. **MCP Server**: Exposes tools via the Model Context Protocol for AI assistants
2. **HTTP Server**: Serves HTML forms and handles form submissions

The architecture follows a **separation of concerns** principle, with distinct layers for protocol handling, HTTP serving, form generation, and data persistence.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Form MCP Server                          │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐               │
│  │   MCP Server    │    │   HTTP Server   │               │
│  │                 │    │                 │               │
│  │ ┌─────────────┐ │    │ ┌─────────────┐ │               │
│  │ │createForm   │ │    │ │Form Renderer│ │               │
│  │ │getResponses │ │    │ │Form Handler │ │               │
│  │ └─────────────┘ │    │ │Health Check │ │               │
│  └─────────────────┘    │ └─────────────┘ │               │
│           │              └─────────────────┘               │
│           │                       │                        │
│           └───────────┬───────────┘                        │
│                       │                                    │
│              ┌─────────────────┐                          │
│              │ Storage Layer   │                          │
│              │                 │                          │
│              │ ┌─────────────┐ │                          │
│              │ │In-Memory    │ │                          │
│              │ │Map Storage  │ │                          │
│              │ └─────────────┘ │                          │
│              └─────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                           │
              ┌─────────────────────────┐
              │     External Systems    │
              │                         │
              │ ┌─────────────────────┐ │
              │ │ AI Assistants       │ │
              │ │ (Claude, Cursor,    │ │
              │ │  LibreChat, etc.)   │ │
              │ └─────────────────────┘ │
              │                         │
              │ ┌─────────────────────┐ │
              │ │ Web Browsers        │ │
              │ │ (Form Users)        │ │
              │ └─────────────────────┘ │
              └─────────────────────────┘
```

## MCP Protocol Implementation

### Server Initialization

The MCP server is built using the official MCP TypeScript SDK:

```typescript
// mcp-server.ts - Core MCP server creation
const server = new McpServer(
  {
    name: "mcp-form-server",
    version: "1.0.0", 
    description: "A server for creating and managing HTML forms",
  },
  {
    capabilities: {
      tools: {}, // Tool capabilities are registered dynamically
    },
  }
);
```

### Tool Registration

Two primary tools are exposed:

#### 1. createForm Tool

```typescript
server.registerTool(
  "createForm",
  {
    description: "Create a new HTML form with the provided schema and return a form ID and URL",
    inputSchema: {
      schema: schemaType, // Zod schema for validation
    },
  },
  async ({ schema }) => {
    const formId = randomUUID();
    inMemoryStorage.set(formId, { schema, response: null });
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ formId, url: `${baseUrl}/${formId}` }, null, 2),
      }],
    };
  }
);
```

#### 2. getResponses Tool

```typescript
server.registerTool(
  "getResponses", 
  {
    description: "Get the submission status and responses for a form by its ID",
    inputSchema: {
      formId: z.string().describe("The ID of the form to retrieve responses for"),
    },
  },
  async ({ formId }) => {
    const formData = inMemoryStorage.get(formId);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          submitted: !!formData?.response,
          responses: formData?.response,
        }, null, 2),
      }],
    };
  }
);
```

### Schema Validation

Input validation uses **Zod** for runtime type checking and JSON Schema generation:

```typescript
// types.ts - Schema definition
export const schemaType = z.object({
  title: z.string().describe("The title of the form"),
  description: z.string().optional().describe("Optional description for the form"),
  fields: z.array(z.object({
    id: z.string().describe("Unique identifier for the field"),
    label: z.string().describe("Display label for the field"), 
    type: z.enum(["text", "textarea", "select", "radio", "checkbox", "email"])
      .describe("Type of the form field"),
    required: z.boolean().describe("Whether the field is required"),
    options: z.array(z.string()).optional()
      .describe("Options for select, radio, or checkbox fields"),
  })).describe("Array of form fields"),
}).describe("The form schema object");
```

## HTTP Server Architecture

### Express.js Application Structure

The HTTP server uses **Express.js** with the following middleware stack:

1. **JSON Parser**: `express.json()` for MCP protocol handling
2. **URL Encoded Parser**: `express.urlencoded({ extended: true })` for form submissions
3. **Custom Route Handlers**: Form rendering and submission endpoints

### Endpoint Design

#### Form Serving: `GET /forms/:id`

```typescript
app.get("/forms/:id", async (req, res) => {
  const formId = req.params.id;
  const formData = inMemoryStorage.get(formId);
  
  if (!formData) {
    return res.status(404).send(/* 404 HTML */);
  }
  
  if (formData.response) {
    return res.send(generateAlreadySubmittedHTML(formData.schema));
  }
  
  return res.send(generateFormHTML(formId, formData.schema));
});
```

#### Form Submission: `POST /forms/:id`

```typescript
app.post("/forms/:id", async (req, res) => {
  const formId = req.params.id;
  const formData = inMemoryStorage.get(formId);
  
  // Validate form exists and hasn't been submitted
  if (!formData || formData.response) {
    return res.status(400).send(/* Error HTML */);
  }
  
  // Process and validate form data
  const responses = processFormSubmission(req.body, formData.schema);
  
  // Store response
  formData.response = responses;
  inMemoryStorage.set(formId, formData);
  
  return res.send(generateSuccessHTML(formData.schema));
});
```

#### Health Check: `GET /health`

```typescript
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    forms: inMemoryStorage.size,
  });
});
```

## Data Flow

### Form Creation Flow

```
1. AI Assistant → MCP Tool Call (createForm)
2. MCP Server → Generate UUID
3. MCP Server → Store Schema in Memory
4. MCP Server → Return Form ID + URL
5. AI Assistant → Present URL to User
```

### Form Submission Flow

```
1. User → Access Form URL
2. HTTP Server → Render HTML Form
3. User → Fill Out + Submit Form
4. HTTP Server → Validate Submission
5. HTTP Server → Store Response in Memory
6. HTTP Server → Show Success Page
```

### Response Retrieval Flow

```  
1. AI Assistant → MCP Tool Call (getResponses)
2. MCP Server → Lookup Form by ID
3. MCP Server → Return Submission Status + Data
4. AI Assistant → Process Response Data
```

## Storage Layer

### In-Memory Storage

The primary storage mechanism is a **Map** with the following structure:

```typescript
type StorageEntry = {
  schema: FormSchema;      // Original form configuration
  response: Record<string, any> | null;  // Submitted form data (null = not submitted)
};

const inMemoryStorage = new Map<string, StorageEntry>();
```

### Storage Characteristics

- **Performance**: O(1) lookups by form ID
- **Concurrency**: Thread-safe for Node.js single-threaded model
- **Persistence**: Data persists for server lifetime only
- **Scalability**: Limited by available RAM

### Future Storage Enhancements

The architecture supports pluggable storage backends:

```typescript
interface StorageAdapter {
  get(formId: string): Promise<StorageEntry | null>;
  set(formId: string, entry: StorageEntry): Promise<void>;
  delete(formId: string): Promise<void>;
  size(): Promise<number>;
}

// Potential implementations:
// - FileSystemStorageAdapter (JSON files)
// - PostgreSQLStorageAdapter (relational database)
// - RedisStorageAdapter (key-value cache)
// - MongoDBStorageAdapter (document database)
```

## Security Model

### CSRF Protection

Forms use the **form ID as a CSRF token**:

```html
<input type="hidden" name="_csrf" value="{{formId}}">
```

The server validates that the CSRF token matches the form ID during submission.

### Input Sanitization

All user inputs are **HTML-escaped** to prevent XSS attacks:

```typescript
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

### Validation Layers

1. **Client-side**: HTML5 validation attributes (`required`, `type="email"`)
2. **Server-side**: Type validation and required field checking
3. **Schema-level**: Zod validation for MCP tool inputs

## Transport Mechanisms

### Streamable HTTP Transport

The primary transport for production deployments:

```typescript
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
  onsessioninitialized: (sessionId) => {
    transports[sessionId] = transport;
  },
  // Security: DNS rebinding protection can be enabled
  // enableDnsRebindingProtection: true,
  // allowedHosts: ['127.0.0.1'],
});
```

**Features**:
- Multi-session support
- Session management with UUIDs
- HTTP-based communication
- Compatible with LibreChat and web-based MCP clients

### Session Management

```typescript
// Session lifecycle
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Session creation (on initialize request)
app.post("/mcp", async (req, res) => {
  if (isInitializeRequest(req.body)) {
    const transport = new StreamableHTTPServerTransport({...});
    const server = createServer({...});
    await server.connect(transport);
  }
  await transport.handleRequest(req, res, req.body);
});

// Session cleanup (on transport close) 
transport.onclose = () => {
  if (transport.sessionId) {
    delete transports[transport.sessionId];
  }
};
```

## Form Generation Engine

### HTML Generation Architecture

The form generator creates semantic, accessible HTML:

```typescript
// form-generator.ts - Core generation logic
export function generateFormHTML(
  formId: string, 
  schema: FormSchema,
  errors?: Record<string, string>
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>${generateHead(schema)}</head>
    <body>
      <div class="container">
        ${generateFormContent(formId, schema, errors)}
      </div>
    </body>
    </html>
  `;
}
```

### Field Type Implementations

Each field type has a dedicated generator:

```typescript
function generateField(field: FormField, value?: string, error?: string): string {
  switch (field.type) {
    case 'text':
    case 'email':
      return generateTextInput(field, value, error);
    case 'textarea':
      return generateTextarea(field, value, error);
    case 'select':
      return generateSelect(field, value, error);
    case 'radio':
      return generateRadioGroup(field, value, error);
    case 'checkbox':
      return generateCheckboxGroup(field, value, error);
  }
}
```

### CSS Architecture

Embedded CSS uses modern design principles:

- **System fonts**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`
- **Responsive design**: Mobile-first approach with proper viewport meta tags
- **Accessibility**: High contrast ratios, focus indicators, semantic markup
- **Progressive enhancement**: Works without JavaScript

## Error Handling

### Error Handling Strategy

**Three-tier error handling**:

1. **Validation Errors**: Caught at schema validation level
2. **Runtime Errors**: Handled in tool implementations
3. **HTTP Errors**: Handled by Express middleware

### MCP Error Format

```typescript
// Success response
return {
  content: [{ type: "text", text: JSON.stringify(result) }],
};

// Error response  
return {
  content: [{ type: "text", text: `Error: ${errorMessage}` }],
  isError: true,
};
```

### HTTP Error Pages

Custom error pages for common scenarios:

- **404 Not Found**: Form doesn't exist
- **400 Bad Request**: Invalid form submission
- **Already Submitted**: Form was previously submitted

## Performance Considerations

### Memory Usage

Current in-memory storage characteristics:

- **Form Schema**: ~1KB per form (depending on complexity)
- **Form Response**: ~500B - 5KB per submission (depending on data)
- **Memory Growth**: Linear with number of forms created

### Concurrency

- **Node.js Event Loop**: Single-threaded, non-blocking I/O
- **Express.js**: Handles concurrent HTTP requests efficiently
- **Map Operations**: O(1) performance for storage operations

### Optimization Opportunities

1. **Storage Tiering**: Move old forms to persistent storage
2. **Response Compression**: Gzip HTTP responses
3. **Static Asset CDN**: Serve CSS/JS from CDN
4. **Database Indexing**: Index forms by creation date, status

## Deployment Architecture

### Docker Architecture

```dockerfile
# Multi-stage build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runtime
WORKDIR /app  
COPY --from=build /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Container Features

- **Health Checks**: Built-in HTTP health endpoint
- **Logging**: JSON structured logs with rotation
- **Signals**: Graceful shutdown on SIGTERM/SIGINT
- **Security**: Non-root user, minimal attack surface

### Scaling Considerations

**Current Limitations**:
- Single node deployment
- In-memory storage not shared
- No load balancing support

**Scaling Solutions**:
- **Horizontal**: Multiple instances with shared Redis/Database
- **Vertical**: Increase memory/CPU resources
- **Storage**: External database for persistence
- **Load Balancing**: Nginx or cloud load balancer

### Production Checklist

- [ ] Enable DNS rebinding protection
- [ ] Configure allowed hosts
- [ ] Set up persistent storage
- [ ] Configure log rotation
- [ ] Set up monitoring/alerting
- [ ] Configure reverse proxy
- [ ] Enable HTTPS termination
- [ ] Set up backup strategy

## Extension Points

### Custom Field Types

Add new field types by:

1. **Extending the schema**:
   ```typescript
   type: z.enum([..., "date", "file", "number"])
   ```

2. **Adding generator logic**:
   ```typescript
   case 'date':
     return generateDateInput(field, value, error);
   ```

3. **Adding validation**:
   ```typescript
   if (field.type === 'date') {
     validateDateInput(value);
   }
   ```

### Custom Transports

The architecture supports additional transports:

- **WebSocket**: Real-time bidirectional communication
- **gRPC**: High-performance binary protocol
- **Message Queue**: Async processing with RabbitMQ/Redis

### Storage Backends

Pluggable storage system allows:

- **File-based**: JSON files, SQLite
- **Cloud**: AWS DynamoDB, Google Firestore
- **Cache**: Redis, Memcached
- **Traditional**: PostgreSQL, MongoDB

This architecture provides a solid foundation for extending the Form MCP Server while maintaining clean separation of concerns and scalability.