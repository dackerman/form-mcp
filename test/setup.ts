import { beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'node:crypto';

// Global test server process
let serverProcess: ChildProcess | null = null;

export const TEST_PORT = 3003;
export const TEST_MCP_PORT = 3004;
export const TEST_BASE_URL = `http://localhost:${TEST_PORT}`;
export const TEST_MCP_URL = `http://localhost:${TEST_MCP_PORT}/mcp`;

beforeAll(async () => {
  console.log('Starting test server...');
  
  // Set up environment for test server
  const env = {
    ...process.env,
    MCP_TRANSPORT: 'streamable-http',
    MCP_HTTP_PORT: String(TEST_MCP_PORT),
    MCP_FORM_PORT: String(TEST_PORT),
    MCP_HOSTNAME: TEST_BASE_URL,
  };
  
  // Start the server
  serverProcess = spawn('node', ['dist/index.js'], {
    env,
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  
  // Capture server output for debugging
  serverProcess.stdout?.on('data', (data) => {
    console.log(`[Server stdout]: ${data.toString().trim()}`);
  });
  
  serverProcess.stderr?.on('data', (data) => {
    console.log(`[Server stderr]: ${data.toString().trim()}`);
  });
  
  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server failed to start within timeout'));
    }, 10000);
    
    serverProcess!.stderr?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('MCP Form Server running successfully')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    
    serverProcess!.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
  
  console.log('Test server started successfully');
});

afterAll(async () => {
  console.log('Stopping test server...');
  
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    
    // Wait for process to exit
    await new Promise<void>((resolve) => {
      serverProcess!.on('exit', () => {
        resolve();
      });
      
      // Force kill after timeout
      setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        resolve();
      }, 5000);
    });
  }
  
  console.log('Test server stopped');
});