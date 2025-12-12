FROM alpine AS base
RUN apk add --no-cache nodejs npm git
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./

RUN npm ci --omit=optional
RUN npm install lightningcss --no-save
RUN npm install @tailwindcss/oxide --no-save
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build
FROM base AS runner
WORKDIR /app
ENV PORT=9000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 9000
CMD ["node", "server.js"]
