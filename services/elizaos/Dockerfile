FROM oven/bun:1.2

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV DISABLE_WEB_UI=true

EXPOSE 3001

CMD ["bun", "run", "start"]
