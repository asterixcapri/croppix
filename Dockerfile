FROM node:22.21.1-trixie-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY .npmrc ./
RUN npm install --omit=dev

COPY . .

STOPSIGNAL SIGTERM
EXPOSE 3003
CMD ["npm", "start"]
