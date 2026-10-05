FROM node:22-bookworm-slim
# Keep the publish source tree dependency-free; dependencies are installed inside the image.
WORKDIR /app

RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json .npmrc ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts
COPY app.config.ts ./app.config.ts

RUN pnpm install --frozen-lockfile --ignore-scripts
ENV PORT=3000
ENV BASE_PATH=/
RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
