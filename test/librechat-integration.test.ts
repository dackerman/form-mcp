import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { TEST_MCP_URL } from "./setup.js";

describe("LibreChat Integration Test", () => {
  it("should expose proper schema that LibreChat can use", async () => {
    const client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    const transport = new StreamableHTTPClientTransport(new URL(TEST_MCP_URL));
    await client.connect(transport);

    const result = await client.listTools();

    // Verify both tools are available
    expect(result.tools).toHaveLength(2);
    const toolNames = result.tools.map((t) => t.name);
    expect(toolNames).toContain("createForm");
    expect(toolNames).toContain("getResponses");

    // Check createForm schema - this is what LibreChat will see
    const createForm = result.tools.find((t) => t.name === "createForm");
    const createFormSchema = createForm?.inputSchema as any;

    // Verify the schema has the required structure for LibreChat
    expect(createFormSchema.type).toBe("object");
    expect(createFormSchema.properties).toBeDefined();
    expect(createFormSchema.properties.schema).toBeDefined();
    expect(createFormSchema.properties.schema.type).toBe("object");

    // Verify that the form field types are properly defined
    const schemaProps = createFormSchema.properties.schema.properties;
    expect(schemaProps.title).toBeDefined();
    expect(schemaProps.title.type).toBe("string");
    expect(schemaProps.fields).toBeDefined();
    expect(schemaProps.fields.type).toBe("array");
    expect(schemaProps.fields.items).toBeDefined();
    expect(schemaProps.fields.items.type).toBe("object");

    // Verify field type enum is properly exposed
    const fieldProps = schemaProps.fields.items.properties;
    expect(fieldProps.type).toBeDefined();
    expect(fieldProps.type.enum).toEqual([
      "text",
      "textarea",
      "select",
      "radio",
      "checkbox",
      "email",
    ]);

    console.log("✅ Schema validation passed!");
    console.log(
      "✅ LibreChat should now see proper parameter definitions instead of empty properties"
    );

    await client.close();
  });

  it("should show what LibreChat will see in the schema", async () => {
    const client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    const transport = new StreamableHTTPClientTransport(new URL(TEST_MCP_URL));
    await client.connect(transport);

    const result = await client.listTools();
    const createForm = result.tools.find((t) => t.name === "createForm");

    console.log("\n=== What LibreChat will see for createForm tool ===");
    console.log(JSON.stringify(createForm?.inputSchema, null, 2));

    // Verify this is NOT the broken schema that was causing the issue
    const schema = createForm?.inputSchema as any;
    expect(schema.properties).not.toEqual({}); // This was the bug
    expect(Object.keys(schema.properties)).toHaveLength(1);
    expect(schema.properties.schema).toBeDefined();

    console.log("✅ Schema is properly defined and not empty!");

    await client.close();
  });
});
