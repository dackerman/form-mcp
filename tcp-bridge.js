#!/usr/bin/env node

const net = require('net');
const { spawn } = require('child_process');

const PORT = process.env.TCP_PORT || 9001;

const server = net.createServer((socket) => {
  console.error(`New connection from ${socket.remoteAddress}`);
  
  // Spawn the MCP server
  const child = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, MCP_DISABLE_HTTP: 'true' }
  });
  
  // Bridge socket to child stdio
  socket.pipe(child.stdin);
  child.stdout.pipe(socket);
  
  // Handle errors and cleanup
  socket.on('error', (err) => {
    console.error('Socket error:', err);
    child.kill();
  });
  
  child.on('error', (err) => {
    console.error('Child process error:', err);
    socket.end();
  });
  
  socket.on('close', () => {
    console.error('Socket closed');
    child.kill();
  });
  
  child.on('exit', () => {
    console.error('Child process exited');
    socket.end();
  });
});

server.listen(PORT, () => {
  console.error(`TCP bridge listening on port ${PORT}`);
});