# mdstore-locations (الدول ← الولايات ← البلديات) على خادم Contabo — Vercel لا يستعمل هذا الملف
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=7100
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src
COPY data ./data
EXPOSE 7100
CMD ["node", "src/dev.js"]
