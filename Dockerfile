FROM node:latest

EXPOSE 3000
COPY . /app/
RUN cd /app && cp config.js.example config.js && npm install
CMD /app/bin/www