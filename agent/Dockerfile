# LiveKit Cloud builds this image (lk agent create / lk agent deploy).
# glibc base (no Alpine), CA certificates, non-root user, fixed start command.
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-slim AS base
RUN apt-get update -qq && apt-get install --no-install-recommends -y ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY classroom-agent.ts tsconfig.json ./
RUN pnpm prune --prod

FROM base
ARG UID=10001
RUN adduser --disabled-password --gecos "" --home /app --shell /sbin/nologin --uid "${UID}" appuser
COPY --from=build --chown=appuser:appuser /app /app
ENV NODE_ENV=production
USER appuser
CMD [ "pnpm", "start" ]
