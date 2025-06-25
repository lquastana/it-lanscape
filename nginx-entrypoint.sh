#!/bin/sh
set -e

# Default IPs if none provided
if [ -z "$ALLOWED_IPS" ]; then
  ALLOWED_IPS=""
fi

envsubst '\$ALLOWED_IPS' < /etc/nginx/nginx.template > /etc/nginx/nginx.conf
exec nginx -g 'daemon off;'