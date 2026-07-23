#!/bin/bash
# Copyright (c) 2026 Oleksandr Nosov. MIT License.
# Server-side deployment script for staging (admin.4n.com.ua).
# Usage: cd /mnt/data/admin && bash deploy.sh

set -e

echo "Starting deployment..."
cd /mnt/data/admin

echo "Pulling latest code from staging..."
git fetch origin staging
git reset --hard origin/staging
git clean -fd

echo "Rebuilding and restarting backend..."
docker compose -f docker-compose.prod.yml up -d --build

echo "Waiting for container..."
sleep 5

if docker ps --format '{{.Names}}' | grep -q admin_backend; then
    echo "Deployment complete!"
    echo "Check: https://admin.4n.com.ua"
else
    echo "Container failed to start!"
    echo "Check logs: docker compose -f docker-compose.prod.yml logs backend --tail 50"
    exit 1
fi
