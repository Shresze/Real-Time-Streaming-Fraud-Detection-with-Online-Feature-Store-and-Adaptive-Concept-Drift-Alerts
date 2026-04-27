# Build stage
FROM node:20 AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copy a custom nginx config to handle SPA routing if needed
# Use resolver + variable to force dynamic DNS resolution (prevents stale IP after container restart)
RUN echo "server { \
    listen 80; \
    resolver 127.0.0.11 valid=5s; \
    set \$backend http://inference-api:8000; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass \$backend\$request_uri; \
        rewrite ^/api/(.*)\$ /\$1 break; \
        proxy_set_header Host \$host; \
        proxy_set_header X-Real-IP \$remote_addr; \
    } \
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
