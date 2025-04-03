FROM node:22.14.0-bookworm-slim AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN corepack enable
RUN yarn install
COPY . .


FROM node:22.14.0-bookworm-slim
LABEL maintainer="Alessandro Astarita <aleast@caprionline.it>"

WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./

STOPSIGNAL SIGTERM
EXPOSE 3003
CMD ["yarn", "start"]
