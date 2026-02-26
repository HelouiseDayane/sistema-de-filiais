

# Build de produção com Nginx

FROM node:20 AS build
WORKDIR /app
COPY . .
# Mostra logs detalhados do build para depuração
RUN rm -rf node_modules package-lock.json && npm cache clean --force && npm install && npm run build || (echo '==== ERRO NO BUILD DO FRONTEND ====' && cat /app/npm-debug.log && exit 1)

FROM nginx:alpine
RUN mkdir -p /usr/share/nginx/html /etc/nginx/ssl
COPY --from=build /app/dist /usr/share/nginx/html
COPY ssl/localhost.crt /etc/nginx/ssl/localhost.crt
COPY ssl/localhost.key /etc/nginx/ssl/localhost.key
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80