#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from 'express';
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { storage } from './storage.js';
import { startHttpServer, createHttpServer } from './http-server.js';
import { 
  FormSchema, 
  CreateFormRequest, 
  CreateFormResponse, 
  GetResponsesRequest, 
  GetResponsesResponse 
} from './types.js';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';

// Create the MCP server
const server = new McpServer(
  {
    name: "mcp-form-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Register createForm tool
server.registerTool('createForm', {
  description: 'Create a new HTML form with the provided schema and return a form ID and URL',
  inputSchema: {
    schema: z.any().describe('The form schema object containing title, description, and fields')
  }
}, async ({ schema }) => {
  console.error('createForm received schema:', JSON.stringify(schema, null, 2));
  console.error('createForm schema type:', typeof schema);

  try {
    // Normalize fields - ensure they have 'id' property (LibreChat might send 'name' instead)
    for (const field of schema.fields) {
      if (!field.id && (field as any).name) {
        field.id = (field as any).name;
      }
      if (!field.id) {
        throw new Error(`Field must have 'id' or 'name' property`);
      }
      
      if (['select', 'radio', 'checkbox'].includes(field.type) && (!field.options || field.options.length === 0)) {
        throw new Error(`Field type ${field.type} requires options array`);
      }
    }
    
    // Generate unique form ID
    const formId = randomUUID();
    const port = process.env.MCP_FORM_PORT || '3000';
    const hostname = process.env.MCP_HOSTNAME || `http://localhost:${port}`;
    const url = `${hostname}/forms/${formId}`;
    
    // Store form
    storage.setForm(formId, {
      schema,
      responses: null,
      submitted: false
    });
    
    console.error(`Created form ${formId}: ${schema.title}`);
    
    const response: CreateFormResponse = {
      formId,
      url
    };
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  } catch (error) {
    console.error(`Error creating form:`, error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

// Register getResponses tool
server.registerTool('getResponses', {
  description: 'Get the submission status and responses for a form by its ID',
  inputSchema: {
    formId: z.string().describe('The ID of the form to retrieve responses for')
  }
}, async ({ formId }) => {
  try {
    const formData = await storage.getForm(formId);
    
    if (!formData) {
      throw new Error(`Form with ID ${formId} not found`);
    }
    
    const response: GetResponsesResponse = {
      submitted: formData.submitted,
      responses: formData.responses
    };
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  } catch (error) {
    console.error(`Error getting responses:`, error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  try {
    // Initialize storage
    await storage.init();
    
    // Set up graceful shutdown
    storage.setupGracefulShutdown();
    
    // Determine if we should use streamable HTTP or stdio
    const useStreamableHttp = process.env.MCP_TRANSPORT === 'streamable-http' || process.env.MCP_HTTP_PORT;
    
    if (useStreamableHttp) {
      // Use streamable HTTP transport with standalone Express server
      const httpPort = parseInt(process.env.MCP_HTTP_PORT || '3001');
      const app = express();
      app.use(express.json());
      
      // Add our form endpoints to the Express app
      if (process.env.MCP_DISABLE_HTTP !== 'true') {
        const formApp = await createHttpServer();
        // Mount form routes
        app.use('/', formApp);
      }
      
      // Map to store transports by session ID
      const transports: Record<string, StreamableHTTPServerTransport> = {};
      
      // MCP POST endpoint handler
      const mcpPostHandler = async (req: express.Request, res: express.Response) => {
        const sessionId = req.headers['mcp-session-id'] as string;
        
        try {
          let transport: StreamableHTTPServerTransport;
          
          if (sessionId && transports[sessionId]) {
            // Reuse existing transport
            transport = transports[sessionId];
          } else if (!sessionId && isInitializeRequest(req.body)) {
            // New initialization request
            const eventStore = new InMemoryEventStore();
            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
              eventStore,
              onsessioninitialized: (sessionId) => {
                console.error(`Session initialized with ID: ${sessionId}`);
                transports[sessionId] = transport;
              }
            });
            
            // Set up onclose handler
            transport.onclose = () => {
              const sid = transport.sessionId;
              if (sid && transports[sid]) {
                console.error(`Transport closed for session ${sid}`);
                delete transports[sid];
              }
            };
            
            // Connect the transport to the MCP server
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
            return;
          } else {
            // Invalid request
            res.status(400).json({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided'
              },
              id: null
            });
            return;
          }
          
          // Handle the request with existing transport
          await transport.handleRequest(req, res, req.body);
        } catch (error) {
          console.error('Error handling MCP request:', error);
          if (!res.headersSent) {
            res.status(500).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal server error'
              },
              id: null
            });
          }
        }
      };
      
      // Handle GET requests for SSE streams
      const mcpGetHandler = async (req: express.Request, res: express.Response) => {
        const sessionId = req.headers['mcp-session-id'] as string;
        if (!sessionId || !transports[sessionId]) {
          res.status(400).send('Invalid or missing session ID');
          return;
        }
        
        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
      };
      
      // Handle DELETE requests for session termination
      const mcpDeleteHandler = async (req: express.Request, res: express.Response) => {
        const sessionId = req.headers['mcp-session-id'] as string;
        if (!sessionId || !transports[sessionId]) {
          res.status(400).send('Invalid or missing session ID');
          return;
        }
        
        try {
          const transport = transports[sessionId];
          await transport.handleRequest(req, res);
        } catch (error) {
          console.error('Error handling session termination:', error);
          if (!res.headersSent) {
            res.status(500).send('Error processing session termination');
          }
        }
      };
      
      // Set up MCP routes
      app.post('/mcp', mcpPostHandler);
      app.get('/mcp', mcpGetHandler);
      app.delete('/mcp', mcpDeleteHandler);
      
      // Start Express server - bind to 0.0.0.0 to accept connections from Docker
      app.listen(httpPort, '0.0.0.0', () => {
        console.error(`HTTP server listening on port ${httpPort}`);
      });
      
      console.error("MCP Form Server running successfully");
      console.error("- MCP server: streamable HTTP transport");
      console.error(`- HTTP server: http://localhost:${httpPort}`);
      
    } else {
      // Use stdio transport
      if (process.env.MCP_DISABLE_HTTP !== 'true') {
        await startHttpServer();
      }
      
      const transport = new StdioServerTransport();
      await server.connect(transport);
      
      console.error("MCP Form Server running successfully");
      console.error("- MCP server: stdio transport");
      console.error(`- HTTP server: http://localhost:${process.env.MCP_FORM_PORT || '3000'}`);
    }
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error("Server startup error:", error);
  process.exit(1);
});