#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage.js';
import { startHttpServer } from './http-server.js';
import { 
  FormSchema, 
  CreateFormRequest, 
  CreateFormResponse, 
  GetResponsesRequest, 
  GetResponsesResponse 
} from './types.js';

// Create the MCP server
const server = new Server(
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

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "createForm",
        description: "Create a new HTML form with the provided schema and return a form ID and URL",
        inputSchema: {
          type: "object",
          properties: {
            schema: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "The title of the form"
                },
                description: {
                  type: "string",
                  description: "Optional description for the form"
                },
                fields: {
                  type: "array",
                  description: "Array of form fields",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        description: "Unique identifier for the field"
                      },
                      label: {
                        type: "string",
                        description: "Display label for the field"
                      },
                      type: {
                        type: "string",
                        enum: ["text", "textarea", "select", "radio", "checkbox"],
                        description: "Type of the form field"
                      },
                      required: {
                        type: "boolean",
                        description: "Whether the field is required"
                      },
                      options: {
                        type: "array",
                        items: { type: "string" },
                        description: "Options for select, radio, or checkbox fields"
                      }
                    },
                    required: ["id", "label", "type", "required"]
                  }
                }
              },
              required: ["title", "fields"]
            }
          },
          required: ["schema"]
        }
      },
      {
        name: "getResponses",
        description: "Get the submission status and responses for a form by its ID",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The ID of the form to retrieve responses for"
            }
          },
          required: ["formId"]
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case "createForm": {
        const { schema } = args as unknown as CreateFormRequest;
        
        // Validate schema
        if (!schema || !schema.title || !schema.fields || !Array.isArray(schema.fields)) {
          throw new Error("Invalid schema: must include title and fields array");
        }
        
        // Validate fields
        for (const field of schema.fields) {
          if (!field.id || !field.label || !field.type) {
            throw new Error(`Invalid field: each field must have id, label, and type`);
          }
          
          if (!['text', 'textarea', 'select', 'radio', 'checkbox'].includes(field.type)) {
            throw new Error(`Invalid field type: ${field.type}`);
          }
          
          if (['select', 'radio', 'checkbox'].includes(field.type) && (!field.options || !Array.isArray(field.options) || field.options.length === 0)) {
            throw new Error(`Field type ${field.type} requires options array`);
          }
        }
        
        // Generate unique form ID
        const formId = uuidv4();
        const port = process.env.MCP_FORM_PORT || '3000';
        const url = `http://localhost:${port}/forms/${formId}`;
        
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
      }
      
      case "getResponses": {
        const { formId } = args as unknown as GetResponsesRequest;
        
        if (!formId) {
          throw new Error("formId is required");
        }
        
        const formData = storage.getForm(formId);
        
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
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error in tool ${name}:`, error);
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
    
    // Start HTTP server
    await startHttpServer();
    
    // Connect to MCP transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error("MCP Form Server running successfully");
    console.error("- MCP server: stdio transport");
    console.error(`- HTTP server: http://localhost:${process.env.MCP_FORM_PORT || '3000'}`);
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