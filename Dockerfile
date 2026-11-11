# syntax=docker/dockerfile:1.7
# Includes the November 2026 Node.js security fixes in every build/runtime stage.
FROM alpine:3.24 AS base
ENV NODE_VERSION=26.13.1

# Bootstrap the official release while Docker Hub's Node image publication lags.
# Keep both archive checksums aligned with NODE_VERSION and nodejs.org SHASUMS256.txt.
RUN addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node \
    && apk add --no-cache git libatomic libstdc++ libc6-compat \
    && apk add --no-cache --virtual .node-download-deps curl xz \
    && arch="$(apk --print-arch)" \
    && case "$arch" in \
      x86_64) archive="node-v${NODE_VERSION}-linux-x64-musl.tar.xz"; checksum="c2ade3fc8a670f0b110eb68c020026daf1ac57b4fceed1ca471106fc144d8720" ;; \
      aarch64) archive="node-v${NODE_VERSION}.tar.xz"; checksum="a7f6204ff63b6a2cd274d48903285abb86ed53a99070e532d4c2fd787457d9e6" ;; \
      *) echo "Unsupported Node.js architecture: $arch" >&2; exit 1 ;; \
    esac \
    && curl --fail --show-error --location --retry 3 \
      "https://nodejs.org/dist/v${NODE_VERSION}/${archive}" -o "/tmp/${archive}" \
    && printf '%s  %s\n' "$checksum" "/tmp/${archive}" | sha256sum -c - \
    && if [ "$arch" = "x86_64" ]; then \
      tar -xJf "/tmp/${archive}" -C /usr/local --strip-components=1 --no-same-owner; \
    else \
      apk add --no-cache --virtual .node-source-deps \
        binutils-gold g++ gcc libgcc linux-headers make python3 py-setuptools rust cargo \
      && tar -xJf "/tmp/${archive}" -C /tmp \
      && cd "/tmp/node-v${NODE_VERSION}" \
      && ./configure \
      && make -j2 \
      && make install \
      && cd / \
      && rm -rf "/tmp/node-v${NODE_VERSION}" \
      && apk del .node-source-deps; \
    fi \
    && rm "/tmp/${archive}" \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs \
    && apk del .node-download-deps \
    && test "$(node --version)" = "v${NODE_VERSION}" \
    && npm --version
WORKDIR /app

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

RUN --mount=type=secret,id=sentry_auth_token,required=false \
    if [ "$SENTRY_UPLOAD_SOURCEMAPS" = "true" ] && [ -f /run/secrets/sentry_auth_token ]; then \
      SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)" npm run build:docker; \
    else \
      npm run build:docker; \
    fi
FROM base AS runner
WORKDIR /app
ARG BLOG_CONTENT_REVISION=unknown
ENV NODE_ENV=production
ENV PORT=9000
ENV BLOG_CONTENT_REVISION=$BLOG_CONTENT_REVISION
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/src/app/scanner-404/trace-guard.cjs ./trace-guard.cjs
EXPOSE 9000
CMD ["node", "--require", "./trace-guard.cjs", "server.js"]
