FROM node:20.18.0-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install
COPY . .


FROM node:20.18.0-bookworm-slim
LABEL maintainer="Alessandro Astarita <aleast@caprionline.it>"

WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./

STOPSIGNAL SIGTERM
EXPOSE 3003
CMD ["node", "/app/src/app.js"]
