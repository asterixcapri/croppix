FROM node:22.14.0-bookworm-slim

RUN apt-get update \
    && apt-get -y install \
        sudo \
        vim \
    && apt-get clean

RUN corepack enable

RUN echo root:node | chpasswd \
    && echo node:node | chpasswd \
    && usermod -aG sudo node

STOPSIGNAL SIGTERM
EXPOSE 3003
CMD ["yarn", "start"]
