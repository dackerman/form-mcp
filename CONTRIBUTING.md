# Contributing to Form MCP Server

Thank you for your interest in contributing! This guide will help you get started with developing and improving the Form MCP Server.

## Development Setup

### Prerequisites

- **Node.js 18+** with **pnpm** package manager
- **Docker** and **Docker Compose** (for testing)
- **Git** for version control

### Getting Started

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/yourusername/form-mcp.git
   cd form-mcp
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install
   ```

3. **Build the Project**:
   ```bash
   pnpm build
   ```

4. **Run Tests**:
   ```bash
   pnpm test
   ```

5. **Start Development Server**:
   ```bash
   pnpm dev
   ```

## Project Structure

```
form-mcp/
├── src/                           # Source code
│   ├── index.ts                   # Main entry point
│   ├── mcp-server.ts             # MCP server implementation
│   ├── http-server.ts            # Express HTTP server
│   ├── form-generator.ts         # HTML form generation
│   └── types.ts                  # TypeScript interfaces
├── test/                         # Test files
│   └── mcp-server.test.ts        # Test suite
├── systemd/                      # Linux service files
├── docker/                       # Docker configuration
├── dist/                         # Compiled JavaScript (generated)
└── forms.json                    # Persistent form storage
```

## Development Workflow

### Code Style

We use **Prettier** for code formatting:

```bash
# Format code
pnpm format

# Check formatting
pnpm format:check
```

**Code Style Guidelines:**
- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Use descriptive variable and function names
- Keep functions focused and single-purpose

### Testing

Run tests during development:

```bash
# Run all tests
pnpm test

# Watch mode for active development
pnpm test:watch

# UI test runner
pnpm test:ui
```

**Test Structure:**
- Tests are in the `test/` directory
- Use Vitest as the test runner
- Write tests for new features and bug fixes
- Test both MCP functionality and HTTP endpoints
- Mock external dependencies where appropriate

### Environment Variables

Development environment variables:

```bash
# Basic configuration
MCP_PORT=3000                     # Server port
MCP_HOSTNAME=localhost            # Hostname for form URLs
NODE_ENV=development              # Environment mode

# Test configuration (used by test suite)
TEST_PORT=3003                    # Test server port
TEST_MCP_PORT=3004               # Test MCP endpoint
```

## Making Changes

### Adding New Features

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write tests first** (TDD approach):
   ```bash
   # Add tests to test/mcp-server.test.ts
   pnpm test:watch
   ```

3. **Implement the feature**:
   - Add TypeScript interfaces to `types.ts`
   - Implement MCP tools in `mcp-server.ts`
   - Add HTTP endpoints to `http-server.ts`
   - Update form generation in `form-generator.ts`

4. **Verify everything works**:
   ```bash
   pnpm test
   pnpm build
   pnpm dev  # Manual testing
   ```

### Bug Fixes

1. **Create a bug fix branch**:
   ```bash
   git checkout -b fix/issue-description
   ```

2. **Write a failing test** that reproduces the bug

3. **Fix the bug** and ensure the test passes

4. **Verify no regression** by running the full test suite

### Improving Documentation

- Update relevant README sections
- Add/update JSDoc comments
- Update ARCHITECTURE.md for implementation details
- Consider adding examples for complex features

## MCP Development Guidelines

### Understanding MCP

The **Model Context Protocol (MCP)** is a standardized way for AI assistants to interact with external tools and data sources.

**Key Concepts:**
- **Server**: Exposes tools, resources, and prompts
- **Client**: AI assistant that connects to servers
- **Transport**: Communication layer (stdio, HTTP, SSE)
- **Tools**: Functions the AI can call with parameters
- **Schema**: JSON Schema definitions for tool parameters

### MCP Best Practices

1. **Tool Design**:
   - Keep tool names descriptive and consistent
   - Use Zod schemas for parameter validation
   - Provide clear descriptions for tools and parameters
   - Return structured, consistent results

2. **Schema Definition**:
   ```typescript
   // Good: Descriptive schema with validation
   const FormSchema = z.object({
     title: z.string().min(1).describe('The title of the form'),
     fields: z.array(FieldSchema).min(1).describe('Form fields array')
   }).describe('Form configuration schema');
   ```

3. **Error Handling**:
   ```typescript
   // Good: Descriptive error messages
   if (!formId) {
     throw new Error('Form ID is required to retrieve responses');
   }
   ```

4. **Transport Support**:
   - Primary: Streamable HTTP (production)
   - Secondary: stdio (development/testing)
   - Future: SSE (real-time updates)

## Testing Guidelines

### Unit Tests

Test individual components:

```typescript
describe('Form Generation', () => {
  it('should generate valid HTML for text fields', () => {
    const field = { type: 'text', label: 'Name', required: true };
    const html = generateFieldHtml(field);
    expect(html).toContain('input type="text"');
    expect(html).toContain('required');
  });
});
```

### Integration Tests

Test MCP tool functionality:

```typescript
describe('MCP Tools', () => {
  it('should create form and return valid URL', async () => {
    const result = await server.callTool('createForm', { schema });
    expect(result.formId).toBeTruthy();
    expect(result.url).toMatch(/^http:\/\/localhost:\d+\/forms\/.+$/);
  });
});
```

### Manual Testing

1. **Start development server**:
   ```bash
   pnpm dev
   ```

2. **Test MCP integration** with a client like Claude Desktop

3. **Test HTTP endpoints** directly:
   ```bash
   curl http://localhost:3000/health
   ```

## Docker Development

### Local Docker Testing

```bash
# Build and run
docker compose up -d

# View logs
docker compose logs -f

# Rebuild after changes
docker compose build
docker compose up -d
```

### Docker Best Practices

- Use multi-stage builds for smaller images
- Run as non-root user for security
- Include health checks
- Use volumes for persistent data
- Follow official Node.js Docker guidelines

## Release Process

### Version Bumping

1. **Update version** in `package.json`
2. **Update CHANGELOG.md** with new features/fixes
3. **Tag the release**:
   ```bash
   git tag -a v1.1.0 -m "Release version 1.1.0"
   git push origin v1.1.0
   ```

### Deployment Testing

Before releasing:

1. **Test all transport modes** (stdio, HTTP)
2. **Test with multiple MCP clients** (Claude, Cursor, LibreChat)
3. **Verify Docker deployment** works correctly
4. **Run full test suite** in CI environment

## Common Development Tasks

### Adding a New Form Field Type

1. **Update TypeScript types** in `types.ts`:
   ```typescript
   export type FieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'newtype';
   ```

2. **Add field generation logic** in `form-generator.ts`:
   ```typescript
   case 'newtype':
     return `<input type="newtype" ...>`;
   ```

3. **Add validation** in HTTP server
4. **Write tests** for the new field type
5. **Update documentation**

### Adding a New MCP Tool

1. **Define input schema** with Zod:
   ```typescript
   const NewToolSchema = z.object({
     param: z.string().describe('Parameter description')
   });
   ```

2. **Register the tool**:
   ```typescript
   server.registerTool('newTool', {
     description: 'Tool description',
     inputSchema: { schema: NewToolSchema }
   }, async ({ param }) => {
     // Implementation
   });
   ```

3. **Add tests** for the new tool
4. **Update documentation**

### Debugging Common Issues

#### MCP Connection Problems
- Check tool registration and schema generation
- Verify transport configuration
- Test with MCP client directly

#### Form Rendering Issues
- Check HTML generation logic
- Verify CSS styles are applied
- Test form submission flow

#### Storage Problems
- Check file permissions on forms.json
- Verify JSON serialization/deserialization
- Test concurrent access scenarios

## Getting Help

- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Report bugs via GitHub Issues
- **MCP Resources**: 
  - [MCP Documentation](https://modelcontextprotocol.io/)
  - [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
  - [MCP Examples](https://github.com/modelcontextprotocol/servers)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help newcomers get started
- Follow the project's technical standards
- Report issues responsibly

Thank you for contributing to Form MCP Server! 🎉