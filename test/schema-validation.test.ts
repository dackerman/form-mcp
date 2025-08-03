import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { TEST_MCP_URL } from "./setup.js";

describe("Schema Validation", () => {
  it("should confirm tool schemas are properly exposed", async () => {
    const client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    const transport = new StreamableHTTPClientTransport(new URL(TEST_MCP_URL));
    await client.connect(transport);

    const result = await client.listTools();

    // Verify createForm tool schema has proper structure
    const createForm = result.tools.find((t) => t.name === "createForm");
    expect(createForm).toBeDefined();
    expect(createForm?.inputSchema).toBeDefined();

    const createFormSchema = createForm?.inputSchema as any;
    expect(createFormSchema.type).toBe("object");
    expect(createFormSchema.properties.schema).toBeDefined();
    expect(createFormSchema.properties.schema.type).toBe("object");
    expect(createFormSchema.properties.schema.properties.title).toBeDefined();
    expect(createFormSchema.properties.schema.properties.fields).toBeDefined();
    expect(createFormSchema.properties.schema.properties.fields.type).toBe(
      "array"
    );
    expect(createFormSchema.required).toContain("schema");

    // Verify getResponses tool schema has proper structure
    const getResponses = result.tools.find((t) => t.name === "getResponses");
    expect(getResponses).toBeDefined();
    expect(getResponses?.inputSchema).toBeDefined();

    const getResponsesSchema = getResponses?.inputSchema as any;
    expect(getResponsesSchema.type).toBe("object");
    expect(getResponsesSchema.properties.schema).toBeDefined();
    expect(getResponsesSchema.properties.schema.type).toBe("object");
    expect(
      getResponsesSchema.properties.schema.properties.formId
    ).toBeDefined();
    expect(getResponsesSchema.properties.schema.properties.formId.type).toBe(
      "string"
    );
    expect(getResponsesSchema.required).toContain("schema");

    console.log("\n✅ Tool schemas are correctly exposed!");
    console.log("The issue is likely with LibreChat's MCP client integration.");

    await client.close();
  });

  it("should successfully call createForm with proper arguments", async () => {
    const client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    const transport = new StreamableHTTPClientTransport(new URL(TEST_MCP_URL));
    await client.connect(transport);

    // This is the exact same format LibreChat would use
    const result = await client.callTool("createForm", {
      schema: {
        title: "Basic Test Form",
        description: "Please fill out this basic test form.",
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
      },
    });

    expect(result.isError).not.toBe(true);
    expect(result.content).toBeDefined();
    expect(result.content).toHaveLength(1);

    const response = JSON.parse((result.content[0] as any).text);
    expect(response.formId).toBeDefined();
    expect(response.url).toBeDefined();

    console.log("\n✅ Form created successfully!");
    console.log("Response:", response);

    await client.close();
  });
});
