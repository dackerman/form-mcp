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

  it("should list available tools", async () => {
    const result = await client.listTools();
    expect(
      result.tools.filter((tool) => tool.name === "createForm")
    ).toBeDefined();
    expect(
      result.tools.filter((tool) => tool.name === "getResponses")
    ).toBeDefined();
  });
});
