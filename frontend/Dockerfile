FROM node:18-alpine
RUN apk add --no-cache socat
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "socat TCP-LISTEN:5000,fork TCP:backend:5000 & npm start"]
