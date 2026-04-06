FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the project
RUN pnpm build

# Expose port
EXPOSE 3001

# Start the API
CMD ["pnpm", "start:prod"]
