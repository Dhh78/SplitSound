FROM node:18-alpine

WORKDIR /app

COPY package-signaling.json package.json
RUN npm install

COPY signaling-server.js .

EXPOSE 8080

CMD ["npm", "start"]
