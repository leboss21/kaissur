FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install dependencies including devDependencies for build
RUN npm ci

# Copy backend source code
COPY backend/ .

# Generate Prisma Client and compile TypeScript
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built application and production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 5000

CMD ["npm", "run", "start"]
