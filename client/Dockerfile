FROM node:20-bookworm-slim

# Create app directory
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5001
CMD ["npm", "start"]