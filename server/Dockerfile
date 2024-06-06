FROM node:22.2.0

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

EXPOSE 8004

CMD ["node", "server/server.js"]
