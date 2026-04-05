#!/bin/sh
set -e

# Substitute environment variables in nginx config
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx in foreground mode but in background of this script
nginx -g 'daemon off;' &
NGINX_PID=$!

# Wait for nginx to be ready
sleep 2

# Check if nginx is responding
if ! curl -sf http://localhost:${PORT}/health > /dev/null; then
    echo "ERROR: Nginx health check failed"
    kill $NGINX_PID 2>/dev/null || true
    exit 1
fi

echo "Nginx is ready and responding on port ${PORT}"

# Wait for nginx process to keep container alive
wait $NGINX_PID
