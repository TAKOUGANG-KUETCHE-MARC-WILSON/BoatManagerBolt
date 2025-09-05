
FROM node:22-alpine

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

ARG PORT=19006
ENV PORT=${PORT}
EXPOSE $PORT 19001 19002 8081

RUN apk update && apk add --no-cache \
  git \
  python3 \
  build-base \
  procps
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .


RUN adduser -D expo
RUN chown -R expo:expo /app 
USER expo

# Empêche expo-cli de poser des questions interactives
ENV EXPO_NO_INTERACTIVE=1
ENV EXPO_USE_DEV_SERVER=1
ENV CI=1

CMD ["npx", "expo", "start", "--lan", "--port", "19006"]

# run command: docker build -t my-expo-app .
# run command: docker run -it -p 19006:19006 -p 19001:19001 -p 19002:19002 -p 8081:8081 my-expo-app
# docker run -it -p 19006:19006 -p 19001:19001 -p 19002:19002 -p 8081:8081 yourbot
