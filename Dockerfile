# syntax=docker/dockerfile:1.7
FROM alpine AS base
RUN apk add --no-cache nodejs npm git
WORKDIR /app

RUN apk add --no-cache libc6-compat
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./

RUN npm ci --omit=optional
RUN npm install lightningcss --no-save
RUN npm install @tailwindcss/oxide --no-save
FROM base AS builder
WORKDIR /app

ARG NEXT_PUBLIC_SENTRY_APPLICATION_KEY=techzjc-site-index
ARG SENTRY_ORG=jiacheng-zhao
ARG SENTRY_PROJECT=javascript-nextjs
ARG SENTRY_UPLOAD_SOURCEMAPS=false

ENV NEXT_PUBLIC_SENTRY_APPLICATION_KEY=$NEXT_PUBLIC_SENTRY_APPLICATION_KEY
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV SENTRY_UPLOAD_SOURCEMAPS=$SENTRY_UPLOAD_SOURCEMAPS

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN --mount=type=secret,id=sentry_auth_token \
    export SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)" && \
    npm run build:docker
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=9000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 9000
CMD ["node", "server.js"]
