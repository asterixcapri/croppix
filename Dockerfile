FROM node:22.21.1-trixie-slim

WORKDIR /app
ENV NODE_ENV=production

COPY . .
RUN corepack enable && yarn install --immutable

STOPSIGNAL SIGTERM
EXPOSE 3003
CMD ["yarn", "start"]
