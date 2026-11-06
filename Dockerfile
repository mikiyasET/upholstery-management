FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

RUN echo 'server { \
    listen       80; \
    server_name  localhost; \
    location ~* \.(?:ttf|otf|woff|woff2|jpg|jpeg|png|svg|webp|ico)$ { \
        root   /usr/share/nginx/html; \
        expires 1y; \
        add_header Cache-Control "public, max-age=31536000, immutable"; \
        try_files $uri =404; \
    } \
    location = /cargo2.ttf { \
        root   /usr/share/nginx/html; \
        try_files /CARGO2.ttf =404; \
    } \
    location = /Holographic-foil.jpg { \
        root   /usr/share/nginx/html; \
        try_files /holographic-foil.jpg =404; \
    } \
    location / { \
        root   /usr/share/nginx/html; \
        index  index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
