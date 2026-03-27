FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Validate config on build — fails fast if nginx.conf has syntax errors
RUN nginx -t

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
