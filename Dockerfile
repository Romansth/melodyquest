FROM node:22.2.0 AS build

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

EXPOSE 3052

CMD ["npm", "start"]

