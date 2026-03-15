FROM node:22-slim

WORKDIR /usr/app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 5000

CMD [ "npm" ,"start" ]