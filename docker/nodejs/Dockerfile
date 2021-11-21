FROM node:16

WORKDIR /var/www/comtext
RUN mkdir node_modules

COPY package*.json ./

RUN chown -R node:node /var/www
RUN usermod -u 1000 node

EXPOSE 8080
CMD yarn --frozen-lockfile && \
    yarn docs:dev
