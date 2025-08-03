#!/usr/bin/env node

import { createMcpServer } from "./mcp-server.js";

const port = parseInt(process.env.MCP_PORT || "3000");
const hostname = process.env.MCP_HOSTNAME || "localhost";
const https = process.env.MCP_HTTPS === "false";

createMcpServer({
  port,
  hostname,
  https,
});
