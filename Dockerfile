FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY backend ./backend
COPY public ./public
ENV PORT=8787 DATA_DIR=/data
EXPOSE 8787
CMD ["node", "backend/server.js"]
