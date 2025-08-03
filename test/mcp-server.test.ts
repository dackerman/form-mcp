import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMcpServer } from "../src/mcp-server.js";

describe("MCP Form Server", () => {
  let client: Client;
  let transport: StreamableHTTPClientTransport;
  let server: Server;

  beforeEach(async () => {
    return new Promise((resolve) => {
      const port = Math.floor(Math.random() * 6000) + 4000;
      server = createMcpServer({
        port,
        hostname: "localhost",
        https: false,
      });

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

      server.on("listening", async () => {
        // Create transport
        transport = new StreamableHTTPClientTransport(
          new URL(`http://localhost:${port}/mcp`)
        );

        // Connect the client
        await client.connect(transport);
        resolve(undefined);
      });
    });
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

  it("should basically work", async () => {
    const result = await client.listTools();
    expect(
      result.tools.filter((tool) => tool.name === "createForm")
    ).toBeDefined();
    expect(
      result.tools.filter((tool) => tool.name === "getResponses")
    ).toBeDefined();

    const createFormText = await client.callTool({
      name: "createForm",
      arguments: {
        title: "Test Form",
        schema: {
          title: "Test Form",
          description: "Test Form Description",
          fields: [
            { id: "name", label: "Name", type: "text", required: false },
          ],
        },
      },
    });

    const createFormResult = JSON.parse(
      createFormText.content[0]?.text as string
    ) as { formId: string; url: string };

    expect(createFormResult.formId).toBeDefined();
    expect(createFormResult.url).toBeDefined();

    console.log("fetching url", createFormResult.url);
    const response = await fetch(createFormResult.url);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Test Form");
    expect(html).toContain("Test Form Description");
    expect(html).toContain("Name");
    expect(html).toContain("text");
    expect(html).toContain("required");
    console.log("html", html);

    const csrfToken = html.match(/csrf_token" value="([^"]+)"/)?.[1];
    expect(csrfToken).toBeDefined();
    console.log("csrfToken", csrfToken);

    const postResponse = await fetch(createFormResult.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        name: "Test name value",
        csrf_token: csrfToken ?? "",
      }).toString(),
    });
    expect(postResponse.status).toBe(200);

    const getResponsesResult = await client.callTool({
      name: "getResponses",
      arguments: {
        formId: createFormResult.formId,
      },
    });
    console.log("getResponsesResult", getResponsesResult);
    const getResponsesResultJson = JSON.parse(
      getResponsesResult.content[0]?.text as string
    ) as { submitted: boolean; responses: Record<string, any> };
    expect(getResponsesResultJson.submitted).toBe(true);
    expect(getResponsesResultJson.responses).toEqual({
      name: "Test name value",
    });
  });
});
