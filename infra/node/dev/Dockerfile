FROM node:20.18.0-bookworm-slim

RUN corepack enable && corepack prepare yarn@4.5.1 --activate

RUN apt-get update \
    && apt-get -y install \
        sudo \
        vim \
    && apt-get clean

RUN echo root:node | chpasswd \
    && echo node:node | chpasswd \
    && usermod -aG sudo node

STOPSIGNAL SIGTERM
EXPOSE 3003
CMD ["node", "/app/croppix/src/app.js"]
