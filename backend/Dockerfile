FROM node:20-alpine

# Install OpenSSL and libc6-compat for Prisma Client runtime on Alpine Linux
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package definitions and prisma schema
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install all dependencies with legacy peer deps support
RUN npm install --legacy-peer-deps

# Copy backend source code
COPY backend/ .

# Build application & generate Prisma client
RUN npm run build

EXPOSE 5000

CMD ["npm", "run", "start"]
