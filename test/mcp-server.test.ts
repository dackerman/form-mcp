import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { v4 as uuidv4 } from "uuid";
import { TEST_MCP_URL, TEST_BASE_URL } from "./setup.js";
import { createMcpServer } from "../src/mcp-server.js";
import { Server } from "node:http";

describe("MCP Form Server", () => {
  let client: Client;
  let transport: StreamableHTTPClientTransport;
  let sessionId: string;
  let server: Server;

  beforeEach(async () => {
    server = createMcpServer();

    // Create a new client for each test
    client = new Client(
      {
        name: "test-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Create transport
    transport = new StreamableHTTPClientTransport(new URL(TEST_MCP_URL));

    // Connect the client
    await client.connect(transport);

    console.log("Client connected successfully");
  });

  afterEach(async () => {
    // Disconnect the client
    if (client) {
      await client.close();
    }

    if (server) {
      server.close();
    }
  });

  it("should list available tools", async () => {
    const result = await client.listTools();

    expect(result.tools).toBeDefined();
    expect(result.tools).toHaveLength(2);

    const toolNames = result.tools.map((tool) => tool.name);
    expect(toolNames).toContain("createForm");
    expect(toolNames).toContain("getResponses");

    // Check createForm tool schema
    const createFormTool = result.tools.find((t) => t.name === "createForm");
    expect(createFormTool).toBeDefined();
    expect(createFormTool?.description).toContain("Create a new HTML form");
    expect(createFormTool?.inputSchema).toBeDefined();

    // Check that inputSchema has properties
    const inputSchema = createFormTool?.inputSchema as any;
    expect(inputSchema.type).toBe("object");
    expect(inputSchema.properties).toBeDefined();
    expect(Object.keys(inputSchema.properties)).toHaveLength(1);
    expect(inputSchema.properties.schema).toBeDefined();
  });

  it("should create a form with the createForm tool", async () => {
    const formSchema = {
      title: "Test Form",
      description: "A test form created by Vitest",
      fields: [
        {
          id: "name",
          label: "Name",
          type: "text",
          required: true,
        },
        {
          id: "email",
          label: "Email",
          type: "text",
          required: true,
        },
        {
          id: "message",
          label: "Message",
          type: "textarea",
          required: false,
        },
      ],
    };

    const result = await client.callTool("createForm", {
      schema: formSchema,
    });

    expect(result.content).toBeDefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");

    const response = JSON.parse((result.content[0] as any).text);
    expect(response.formId).toBeDefined();
    expect(response.url).toBeDefined();
    expect(response.url).toContain(response.formId);
    expect(response.url).toContain(TEST_BASE_URL);

    // Store form ID for next test
    global.testFormId = response.formId;
  });

  it("should handle forms with name property instead of id", async () => {
    const formSchema = {
      title: "LibreChat Style Form",
      description: "Testing field normalization",
      fields: [
        {
          name: "username", // Using 'name' instead of 'id'
          label: "Username",
          type: "text",
          required: true,
        },
        {
          name: "preference",
          label: "Preference",
          type: "select",
          required: false,
          options: ["Option A", "Option B", "Option C"],
        },
      ],
    };

    const result = await client.callTool("createForm", {
      schema: formSchema,
    });

    expect(result.content).toBeDefined();
    expect(result.isError).not.toBe(true);

    const response = JSON.parse((result.content[0] as any).text);
    expect(response.formId).toBeDefined();
  });

  it("should retrieve form responses with getResponses tool", async () => {
    // First create a form
    const createResult = await client.callTool("createForm", {
      schema: {
        title: "Response Test Form",
        fields: [
          {
            id: "test_field",
            label: "Test Field",
            type: "text",
            required: true,
          },
        ],
      },
    });

    const createResponse = JSON.parse((createResult.content[0] as any).text);
    const formId = createResponse.formId;

    // Now get responses for the form
    const result = await client.callTool("getResponses", {
      schema: {
        formId: formId,
      },
    });

    expect(result.content).toBeDefined();
    expect(result.content).toHaveLength(1);

    const response = JSON.parse((result.content[0] as any).text);
    expect(response.submitted).toBe(false);
    expect(response.responses).toBeNull();
  });

  it("should handle non-existent form ID gracefully", async () => {
    const result = await client.callTool("getResponses", {
      schema: {
        formId: uuidv4(), // Random non-existent ID
      },
    });

    expect(result.content).toBeDefined();
    expect(result.isError).toBe(true);

    const text = (result.content[0] as any).text;
    expect(text).toContain("Error");
    expect(text).toContain("not found");
  });

  it("should validate required fields", async () => {
    const invalidSchema = {
      title: "Invalid Form",
      fields: [
        {
          id: "select_field",
          label: "Select Field",
          type: "select",
          required: true,
          // Missing required 'options' for select type
        },
      ],
    };

    const result = await client.callTool("createForm", {
      schema: invalidSchema,
    });

    expect(result.isError).toBe(true);
    const text = (result.content[0] as any).text;
    expect(text).toContain("Error");
    expect(text).toContain("select");
    expect(text).toContain("requires options");
  });

  it("should handle concurrent form creation", async () => {
    // Create multiple forms concurrently
    const formPromises = Array.from({ length: 5 }, (_, i) =>
      client.callTool("createForm", {
        schema: {
          title: `Concurrent Form ${i}`,
          fields: [
            {
              id: `field_${i}`,
              label: `Field ${i}`,
              type: "text",
              required: true,
            },
          ],
        },
      })
    );

    const results = await Promise.all(formPromises);

    // All should succeed
    results.forEach((result, i) => {
      expect(result.isError).not.toBe(true);
      const response = JSON.parse((result.content[0] as any).text);
      expect(response.formId).toBeDefined();
      expect(response.url).toBeDefined();
    });

    // All form IDs should be unique
    const formIds = results.map(
      (r) => JSON.parse((r.content[0] as any).text).formId
    );
    const uniqueIds = new Set(formIds);
    expect(uniqueIds.size).toBe(formIds.length);
  });
});
