FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases
COPY packages ./packages

RUN yarn install

ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

CMD ["sh", "-c", "yarn workspace @monorepo/${SERVICE_NAME} run start"]