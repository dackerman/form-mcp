# Use Node.js LTS version
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the TypeScript code
RUN pnpm run build

# Create directory for persistent storage
RUN mkdir -p /data

# Expose both MCP and HTTP ports
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV MCP_FORM_PORT=3000

# Health check for the HTTP server
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Run the MCP server
CMD ["node", "dist/index.js"]