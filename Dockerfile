FROM node:18-alpine

WORKDIR /dex-arbitrage-bot

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "node", "src/main.js" ]
