FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node --from=builder /app/.next ./.next
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/pages ./pages
COPY --chown=node:node --from=builder /app/lib ./lib
COPY --chown=node:node --from=builder /app/styles ./styles
COPY --chown=node:node --from=builder /app/data ./data
COPY --chown=node:node --from=builder /app/components ./components
COPY --chown=node:node --from=builder /app/hooks ./hooks
COPY --chown=node:node --from=builder /app/scripts ./scripts
COPY --chown=node:node --from=builder /app/middleware.js ./middleware.js
COPY --chown=node:node --from=builder /app/next.config.js ./next.config.js
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "start"]
