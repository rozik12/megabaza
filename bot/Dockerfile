FROM node:22-alpine
WORKDIR /app
COPY bot.js catalog.json logo.png ./
ENV STATE_FILE=/data/state.json
VOLUME /data
CMD ["node", "bot.js"]
