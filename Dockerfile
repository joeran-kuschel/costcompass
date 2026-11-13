FROM node:26-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g corepack && corepack enable
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM build AS migrate
CMD ["pnpm", "drizzle-kit", "migrate"]

FROM node:26-alpine AS runtime
WORKDIR /app
COPY --from=build /app/.output ./.output
USER node
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
