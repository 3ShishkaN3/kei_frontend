FROM node:18-slim as base

WORKDIR /app

COPY package*.json ./

# === DEVELOPMENT ===
FROM base as development

RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 5000

# === BUILDER (production) ===
FROM base as builder

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

# === PRODUCTION ===
FROM node:18-slim as production

WORKDIR /app

RUN groupadd -r appuser && useradd -r -g appuser appuser

COPY --chown=appuser:appuser package*.json ./

RUN npm ci --only=production --legacy-peer-deps

COPY --from=builder --chown=appuser:appuser /app/public ./public
COPY --from=builder --chown=appuser:appuser /app/rollup.config.js ./rollup.config.js

USER appuser

EXPOSE 5000
CMD ["npx", "sirv", "public", "--single", "--port", "5000", "--host", "0.0.0.0"]