import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { TEST_MCP_URL } from "./setup.js";

describe("Tool Schema Investigation", () => {
  it("should have proper tool schemas with defined properties", async () => {
    const client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    const transport = new StreamableHTTPClientTransport(new URL(TEST_MCP_URL));
    await client.connect(transport);

    const result = await client.listTools();

    console.log("=== Tool List Response ===");
    console.log(JSON.stringify(result, null, 2));

    // Check createForm tool specifically
    const createForm = result.tools.find((t) => t.name === "createForm");
    console.log("\n=== CreateForm Tool ===");
    console.log(JSON.stringify(createForm, null, 2));

    expect(createForm).toBeDefined();
    expect(createForm?.inputSchema).toBeDefined();

    const schema = createForm?.inputSchema as any;
    expect(schema.type).toBe("object");
    expect(schema.properties).toBeDefined();
    expect(Object.keys(schema.properties || {})).not.toHaveLength(0);

    // The schema.properties should have a 'schema' property
    expect(schema.properties?.schema).toBeDefined();

    // Log the actual vs expected schema structure
    console.log("\n=== Expected vs Actual Schema ===");
    console.log("Expected properties to include:", {
      schema: {
        type: "any",
        description:
          "The form schema object containing title, description, and fields",
      },
    });
    console.log("Actual properties:", schema.properties);

    await client.close();
  });

  it("should demonstrate the tool call with proper arguments", async () => {
    const client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    const transport = new StreamableHTTPClientTransport(new URL(TEST_MCP_URL));
    await client.connect(transport);

    // This is what LibreChat would send
    const toolCallArgs = {
      schema: {
        fields: [
          {
            type: "text",
            label: "Name",
            name: "name",
            required: true,
          },
          {
            type: "email",
            label: "Email",
            name: "email",
            required: true,
          },
          {
            type: "textarea",
            label: "Comment",
            name: "comment",
            required: false,
          },
        ],
        title: "Basic Test Form",
        description: "Please fill out this basic test form.",
      },
    };

    console.log("\n=== Tool Call Arguments ===");
    console.log(JSON.stringify(toolCallArgs, null, 2));

    try {
      const result = await client.callTool("createForm", toolCallArgs);

      console.log("\n=== Tool Call Result ===");
      console.log(JSON.stringify(result, null, 2));

      expect(result.isError).not.toBe(true);
      expect(result.content).toBeDefined();

      if (result.content && result.content[0]?.type === "text") {
        const response = JSON.parse((result.content[0] as any).text);
        expect(response.formId).toBeDefined();
        expect(response.url).toBeDefined();
      }
    } catch (error) {
      console.log("\n=== Tool Call Error ===");
      console.error(error);
      throw error;
    }

    await client.close();
  });

  it("should inspect the raw JSON-RPC communication", async () => {
    // First, let's make a raw initialize request to see what comes back
    const initRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        capabilities: { tools: {} },
        clientInfo: { name: "test-client", version: "1.0.0" },
        protocolVersion: "2024-10-07",
      },
    };

    console.log("\n=== Raw Initialize Request ===");
    console.log(JSON.stringify(initRequest, null, 2));

    const initResponse = await fetch(TEST_MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(initRequest),
    });

    const responseText = await initResponse.text();
    console.log("\n=== Raw Initialize Response ===");
    console.log(responseText);

    // Extract session ID from SSE response
    const sessionIdMatch = responseText.match(/id: ([^\n]+)/);
    const sessionId = sessionIdMatch ? sessionIdMatch[1].split("_")[0] : null;

    if (sessionId) {
      // Now make a tools/list request
      const toolsRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      };

      console.log("\n=== Raw Tools List Request ===");
      console.log(JSON.stringify(toolsRequest, null, 2));

      const toolsResponse = await fetch(TEST_MCP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "Mcp-Session-Id": sessionId,
        },
        body: JSON.stringify(toolsRequest),
      });

      const toolsText = await toolsResponse.text();
      console.log("\n=== Raw Tools List Response ===");
      console.log(toolsText);

      // Parse the SSE data
      const dataMatch = toolsText.match(/data: (.+)/);
      if (dataMatch) {
        const toolsData = JSON.parse(dataMatch[1]);
        console.log("\n=== Parsed Tools Data ===");
        console.log(JSON.stringify(toolsData, null, 2));
      }
    }
  });
});
