# Production image for Railway (or any Docker host). Studio data lives in
# DATA_DIR – mount a persistent volume there (Railway sets
# RAILWAY_VOLUME_MOUNT_PATH automatically when a volume is attached).
FROM node:22-slim AS build
WORKDIR /app
COPY calm-stories/package.json calm-stories/package-lock.json ./
RUN npm ci
COPY calm-stories/ ./
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "start"]
