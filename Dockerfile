FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY package.json package-lock.json* ./
RUN npm install --production

COPY src ./src

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
