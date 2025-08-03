# Form-MCP Project Documentation

## Overview

Form-MCP is a Model Context Protocol (MCP) server that enables AI assistants to create and manage HTML forms. It integrates with LibreChat to provide form creation capabilities through MCP tools.

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  LibreChat  │───▶│  Form-MCP   │───▶│ HTML Forms  │
│   (Client)  │    │  (Server)   │    │ (Storage)   │
└─────────────┘    └─────────────┘    └─────────────┘
     MCP              Express.js        forms.json
  Streamable         HTTP Server       File System
     HTTP
```

## MCP (Model Context Protocol) Concepts

### What is MCP?
- **Standardized protocol** for LLM tool integration
- **Server-client architecture** where AI assistants (clients) connect to tool servers
- **Transport agnostic** - supports stdio, HTTP, and SSE transports
- **Tool registration** - servers expose tools with JSON schemas for parameter validation

### MCP Transports
1. **stdio** - Single process, direct communication (development/single-user)
2. **streamable-http** - Multi-session HTTP transport (production/multi-user) 
3. **SSE** - Server-Sent Events for real-time updates

### MCP Components
- **Tools** - Functions that AI can call with parameters
- **Resources** - Data sources the AI can read from
- **Prompts** - Reusable prompt templates
- **Sampling** - AI model interaction capabilities

## LibreChat Integration Concepts

### What is LibreChat?
- **Open-source AI chat platform** supporting multiple LLM providers
- **MCP client** that can connect to MCP servers
- **Multi-user support** with authentication and conversation management
- **Docker-based deployment** with microservices architecture

### LibreChat MCP Configuration
- **librechat.yaml** - Main configuration file for MCP servers
- **App-level servers** - Global MCP servers available to all users
- **User-level servers** - Per-user MCP server configurations
- **Tool manifests** - Auto-generated tool lists for UI integration

### Connection Types
```yaml
# Streamable HTTP (recommended for production)
form-mcp:
  type: streamable-http
  url: http://form-mcp:3002/mcp
  timeout: 60000

# Stdio (development only)
form-mcp:
  command: node
  args: ["dist/index.js"]
  env:
    MCP_TRANSPORT: stdio
```

## Project Structure

```
form-mcp/
├── src/
│   ├── index.ts           # Main MCP server with streamable HTTP
│   ├── http-server.ts     # Express server for form rendering
│   ├── storage.ts         # Form data persistence layer
│   └── types.ts           # TypeScript interfaces
├── test/
│   ├── setup.ts           # Test server configuration
│   ├── schema-validation.test.ts  # Schema validation tests
│   ├── mcp-server.test.ts         # MCP functionality tests
│   ├── http-server.test.ts        # Form rendering tests
│   └── librechat-integration.test.ts  # Integration tests
├── docker/
│   └── Dockerfile         # Container configuration
├── docker-compose.yml     # Docker services definition
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── CLAUDE.md             # Project documentation
```

## Building the Project

### Prerequisites
- Node.js 18+ with pnpm package manager
- Docker and Docker Compose for containerization
- TypeScript for development

### Development Setup
```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm run build

# Run tests
pnpm test

# Start development server (stdio mode)
pnpm start

# Start development server (HTTP mode)
MCP_TRANSPORT=streamable-http MCP_HTTP_PORT=3002 MCP_FORM_PORT=3000 pnpm start
```

### Environment Variables
```bash
# Transport configuration
MCP_TRANSPORT=streamable-http  # or 'stdio'
MCP_HTTP_PORT=3002            # MCP endpoint port
MCP_FORM_PORT=3000            # Form rendering port
MCP_HOSTNAME=http://localhost:3000  # Form URL hostname

# Development options
MCP_DISABLE_HTTP=true         # Disable form rendering (MCP only)
```

### Docker Build
```bash
# Build container
docker build -t form-mcp .

# Run standalone
docker run -p 3000:3000 -p 3002:3002 \
  -e MCP_TRANSPORT=streamable-http \
  -e MCP_HTTP_PORT=3002 \
  -e MCP_FORM_PORT=3000 \
  form-mcp

# With persistent storage
docker run -p 3000:3000 -p 3002:3002 \
  -v ./forms.json:/app/forms.json \
  -e MCP_TRANSPORT=streamable-http \
  form-mcp
```

## Testing Strategy

### Test Categories
1. **Schema Validation** - Verify JSON schemas are properly exposed
2. **MCP Server** - Test tool registration and execution
3. **HTTP Server** - Test form rendering and submission
4. **Integration** - Test LibreChat compatibility

### Running Tests
```bash
# All tests
pnpm test

# Specific test suites
pnpm vitest run test/schema-validation.test.ts
pnpm vitest run test/mcp-server.test.ts
pnpm vitest run test/http-server.test.ts

# Watch mode for development
pnpm vitest --watch

# Coverage report
pnpm vitest --coverage
```

### Test Configuration
Tests use a separate server instance on ports 3003/3004 to avoid conflicts:
```typescript
export const TEST_PORT = 3003;        // Form HTTP server
export const TEST_MCP_PORT = 3004;    // MCP endpoint
export const TEST_BASE_URL = `http://localhost:${TEST_PORT}`;
export const TEST_MCP_URL = `http://localhost:${TEST_MCP_PORT}/mcp`;
```

## Deployment

### LibreChat Integration (Recommended)
Add to LibreChat's `docker-compose.yml`:
```yaml
services:
  form-mcp:
    container_name: form-mcp
    build:
      context: ../form-mcp
      dockerfile: Dockerfile
    environment:
      - MCP_TRANSPORT=streamable-http
      - MCP_HTTP_PORT=3002
      - MCP_FORM_PORT=3000
    ports:
      - "3000:3000"  # Form HTTP server
      - "3002:3002"  # MCP endpoint
    volumes:
      - ../form-mcp/forms.json:/app/forms.json
    restart: always
```

Add to LibreChat's `librechat.yaml`:
```yaml
mcpServers:
  form-mcp:
    type: streamable-http
    url: http://form-mcp:3002/mcp
    timeout: 60000
    serverInstructions: |
      This server allows you to create HTML forms for users to fill out.
      Use createForm to generate a form with various field types (text, textarea, select, radio, checkbox).
      Use getResponses to check if forms have been submitted and retrieve responses.
```

### Standalone Deployment
```bash
# Using Docker Compose
docker-compose up -d

# Using systemd (with provided service file)
sudo cp form-mcp.service /etc/systemd/system/
sudo systemctl enable form-mcp
sudo systemctl start form-mcp
```

### Production Considerations
- **Persistent Storage**: Mount `forms.json` as a volume for data persistence
- **Health Checks**: HTTP endpoint `/health` available for monitoring
- **Scaling**: Streamable HTTP transport supports multiple concurrent sessions
- **Security**: Forms use CSRF tokens for submission protection
- **Networking**: Ensure proper Docker network configuration for container communication

## API Reference

### MCP Tools

#### createForm
Creates a new HTML form with the provided schema.

**Parameters:**
```typescript
{
  schema: {
    title: string;                    // Form title (required)
    description?: string;             // Form description (optional)
    fields: Array<{                   // Form fields (required)
      id?: string;                    // Field identifier
      name?: string;                  // Alternative to id (LibreChat compatibility)
      label: string;                  // Display label (required)
      type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'email';  // Field type (required)
      required: boolean;              // Whether field is required (required)
      options?: string[];             // Options for select/radio/checkbox fields
    }>;
  }
}
```

**Returns:**
```typescript
{
  formId: string;    // Unique form identifier
  url: string;       // Form URL (http://hostname/forms/{formId})
}
```

#### getResponses
Retrieves submission status and responses for a form.

**Parameters:**
```typescript
{
  schema: {
    formId: string;    // Form identifier
  }
}
```

**Returns:**
```typescript
{
  submitted: boolean;           // Whether form has been submitted
  responses: object | null;     // Form responses (null if not submitted)
}
```

### HTTP Endpoints

#### Form Rendering
- `GET /forms/{formId}` - Display HTML form or submission confirmation
- `POST /forms/{formId}` - Handle form submission

#### Health Check
- `GET /health` - Server health status and form count

#### MCP Protocol
- `POST /mcp` - MCP JSON-RPC endpoint
- `GET /mcp` - SSE stream for MCP sessions (with session ID header)
- `DELETE /mcp` - Terminate MCP session (with session ID header)

## Schema Validation

### JSON Schema Generation
Form-MCP uses Zod for runtime validation and JSON Schema generation:

```typescript
// Zod schema definition
const FormSchema = z.object({
  title: z.string().describe('The title of the form'),
  description: z.string().optional().describe('Optional description for the form'),
  fields: z.array(z.object({
    id: z.string().optional().describe('Unique identifier for the field'),
    name: z.string().optional().describe('Alternative to id - field name'),
    label: z.string().describe('Display label for the field'),
    type: z.enum(['text', 'textarea', 'select', 'radio', 'checkbox', 'email']).describe('Type of the form field'),
    required: z.boolean().describe('Whether the field is required'),
    options: z.array(z.string()).optional().describe('Options for select, radio, or checkbox fields')
  })).describe('Array of form fields')
}).describe('The form schema object');

// MCP tool registration
server.registerTool('createForm', {
  description: 'Create a new HTML form with the provided schema and return a form ID and URL',
  inputSchema: {
    schema: FormSchema  // This generates proper JSON Schema for LibreChat
  }
}, async ({ schema }) => {
  // Tool implementation
});
```

### Common Schema Issues
1. **Empty Properties** - Using `z.any()` generates `properties: {}` - use complete object schemas instead
2. **Missing Type Information** - Ensure all Zod schemas have proper type definitions
3. **LibreChat Compatibility** - Support both `id` and `name` properties for form fields

## Troubleshooting

### Common Issues

#### MCP Connection Timeouts
```
[MCP][form-mcp] Ping failed: MCP error -32001: Request timed out
```
**Solution:** Restart both containers to ensure proper initialization order:
```bash
docker compose restart form-mcp api
```

#### Empty Tool Schema
```
keyValidator._parse is not a function
```
**Solution:** LibreChat cached old schema. Restart LibreChat after schema changes:
```bash
docker compose restart api
```

#### Container Communication
```
fetch failed - connect ECONNREFUSED
```
**Solution:** Verify Docker network configuration and container names in `librechat.yaml`

#### Form Submission Issues
- **CSRF Protection** - Forms include CSRF tokens for security
- **Field Validation** - Required fields must be filled
- **Single Submission** - Forms can only be submitted once

### Debug Commands
```bash
# Check container status
docker compose ps

# View logs
docker logs form-mcp --tail 20
docker logs LibreChat --tail 20

# Test connectivity
docker exec LibreChat wget -O- http://form-mcp:3002/health

# Verify form data
cat forms.json | jq .

# Test MCP tools
pnpm vitest run test/schema-validation.test.ts
```

## Documentation Links

### MCP Resources
- **Official MCP Documentation**: https://modelcontextprotocol.io/
- **MCP SDK Reference**: https://github.com/modelcontextprotocol/typescript-sdk
- **MCP Specification**: https://spec.modelcontextprotocol.io/
- **MCP Examples**: https://github.com/modelcontextprotocol/servers

### LibreChat Resources  
- **LibreChat Documentation**: https://docs.librechat.ai/
- **MCP Integration Guide**: https://docs.librechat.ai/features/model_context_protocol
- **Configuration Reference**: https://docs.librechat.ai/install/configuration/librechat_yaml
- **Docker Setup**: https://docs.librechat.ai/install/installation/docker_compose

### Development Tools
- **Zod Documentation**: https://zod.dev/
- **Express.js Guide**: https://expressjs.com/
- **Vitest Testing**: https://vitest.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Docker Documentation**: https://docs.docker.com/

### JSON Schema
- **JSON Schema Specification**: https://json-schema.org/
- **Zod to JSON Schema**: https://github.com/StefanTerdell/zod-to-json-schema
- **Schema Validation**: https://ajv.js.org/

## Version History

### Current Version (1.0.0)
- ✅ MCP server with streamable HTTP transport
- ✅ Complete tool schema validation  
- ✅ LibreChat integration
- ✅ Docker containerization
- ✅ Comprehensive test suite
- ✅ Form rendering and submission
- ✅ Multi-user session support

### Future Enhancements
- Database storage backend (PostgreSQL/MongoDB)
- Form validation rules and constraints
- File upload support
- Form analytics and reporting
- Template system for common form types
- Integration with external notification services