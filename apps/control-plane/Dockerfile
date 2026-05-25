FROM node:20-alpine AS builder
WORKDIR /app
COPY apps/control-plane/package.json ./
COPY tsconfig.base.json ../tsconfig.base.json
RUN npm install
COPY apps/control-plane/src ./src
COPY apps/control-plane/tsconfig.json ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/index.js"]
