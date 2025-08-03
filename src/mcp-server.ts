import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { registerHttpEndpoints } from "./http-server.js";
import { storage } from "./storage.js";
import { CreateFormResponse, GetResponsesResponse } from "./types.js";

export function createMcpServer({
  port = 3000,
  hostname = `localhost`,
  https = false,
}: {
  port?: number;
  hostname?: string;
  https?: boolean;
}) {
  // Create the MCP server
  const server = new McpServer(
    {
      name: "mcp-form-server",
      version: "1.0.0",
      description: "A server for creating and managing HTML forms",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register createForm tool
  server.registerTool(
    "createForm",
    {
      description:
        "Create a new HTML form with the provided schema and return a form ID and URL",
      inputSchema: {
        schema: z
          .object({
            title: z.string().describe("The title of the form"),
            description: z
              .string()
              .optional()
              .describe("Optional description for the form"),
            fields: z
              .array(
                z.object({
                  id: z
                    .string()
                    .optional()
                    .describe("Unique identifier for the field"),
                  label: z.string().describe("Display label for the field"),
                  type: z
                    .enum([
                      "text",
                      "textarea",
                      "select",
                      "radio",
                      "checkbox",
                      "email",
                    ])
                    .describe("Type of the form field"),
                  required: z
                    .boolean()
                    .describe("Whether the field is required"),
                  options: z
                    .array(z.string())
                    .optional()
                    .describe("Options for select, radio, or checkbox fields"),
                })
              )
              .describe("Array of form fields"),
          })
          .describe("The form schema object"),
      },
    },
    async ({ schema }) => {
      console.error(
        "createForm received schema:",
        JSON.stringify(schema, null, 2)
      );
      console.error("createForm schema type:", typeof schema);

      try {
        // Generate unique form ID
        const formId = randomUUID();
        const url = `${https ? "https" : "http"}://${hostname}:${port}/forms/${formId}`;

        console.error(`Created form ${formId}: ${schema.title}`);

        const response: CreateFormResponse = {
          formId,
          url,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(`Error creating form:`, error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register getResponses tool
  server.registerTool(
    "getResponses",
    {
      description:
        "Get the submission status and responses for a form by its ID",
      inputSchema: {
        schema: z
          .object({
            formId: z
              .string()
              .describe("The ID of the form to retrieve responses for"),
          })
          .describe("Parameters for retrieving form responses"),
      },
    },
    async ({ schema }) => {
      try {
        const formData = await storage.getForm(schema.formId);

        if (!formData) {
          throw new Error(`Form with ID ${schema.formId} not found`);
        }

        const response: GetResponsesResponse = {
          submitted: formData.submitted,
          responses: formData.responses,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(`Error getting responses:`, error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  const app = express();
  app.use(express.json());

  // Map to store transports by session ID
  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  // Handle POST requests for client-to-server communication
  app.post("/mcp", async (req, res) => {
    // Check for existing session ID
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          // Store the transport by session ID
          transports[sessionId] = transport;
        },
        // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
        // locally, make sure to set:
        // enableDnsRebindingProtection: true,
        // allowedHosts: ['127.0.0.1'],
      });

      // Clean up transport when closed
      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
        }
      };
      const server = new McpServer({
        name: "example-server",
        version: "1.0.0",
      });

      // ... set up server resources, tools, and prompts ...

      // Connect to the MCP server
      await server.connect(transport);
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
      return;
    }

    // Handle the request
    await transport.handleRequest(req, res, req.body);
  });

  // Reusable handler for GET and DELETE requests
  const handleSessionRequest = async (
    req: express.Request,
    res: express.Response
  ) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  };

  registerHttpEndpoints(app);

  // Handle GET requests for server-to-client notifications via SSE
  app.get("/mcp", handleSessionRequest);

  // Handle DELETE requests for session termination
  app.delete("/mcp", handleSessionRequest);

  return app.listen(port, "0.0.0.0");
}
