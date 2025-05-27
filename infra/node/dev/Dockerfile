FROM node:22.14.0-bookworm-slim

RUN corepack enable

STOPSIGNAL SIGTERM
EXPOSE 3003

ENTRYPOINT ["tail", "-f", "/dev/null"]
