FROM node:22.21.1-trixie-slim

RUN corepack enable

STOPSIGNAL SIGTERM
EXPOSE 3003

ENTRYPOINT ["tail", "-f", "/dev/null"]
