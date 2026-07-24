FROM node:20-alpine

WORKDIR /app

# Copy package definitions and prisma schema
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install all dependencies with legacy peer deps support
RUN npm install --legacy-peer-deps

# Copy backend source code
COPY backend/ .

# Build application
RUN npm run build

EXPOSE 5000

CMD ["npm", "run", "start"]
