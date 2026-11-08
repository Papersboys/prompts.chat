#!/usr/bin/env bash
# First-run Ubuntu installation. Secrets are generated on the server only.
set -euo pipefail
umask 077
cd /opt/family-prompts
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y docker.io docker-compose-v2 nginx certbot apache2-utils curl
systemctl enable --now docker nginx
if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
if [[ ! -s .env ]]; then
    docker pull ghcr.io/f/prompts.chat:latest
    image=$(docker image inspect ghcr.io/f/prompts.chat:latest --format '{{index .RepoDigests 0}}')
    [[ "$image" == ghcr.io/f/prompts.chat@sha256:* ]]
    {
        printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)"
        printf 'AUTH_SECRET=%s\n' "$(openssl rand -hex 32)"
        printf 'PROMPTS_IMAGE=%s\n' "$image"
        printf 'APP_MEMORY_LIMIT=1280m\n'
    } > .env
    chmod 600 .env
fi
if [[ ! -s /etc/nginx/prompts-users ]]; then
    access_password=$(openssl rand -hex 16)
    printf '%s\n' "$access_password" | htpasswd -ciB /etc/nginx/prompts-users yuanxi
    printf 'Site: https://prompts.li-family.us\nInvitation username: yuanxi\nInvitation password: %s\n\nAfter entering this invitation credential, register your own app account.\n' "$access_password" > /root/family-prompts-access.txt
    unset access_password
    chown root:www-data /etc/nginx/prompts-users
    chmod 640 /etc/nginx/prompts-users
fi
docker compose config --quiet
docker compose up -d
install -d -m 755 /var/www/prompts-acme
if [[ ! -f /etc/letsencrypt/live/prompts.li-family.us/fullchain.pem ]]; then
    cat > /etc/nginx/sites-available/family-prompts <<'NGINX'
server {
    listen 80;
    server_name prompts.li-family.us;
    location ^~ /.well-known/acme-challenge/ { root /var/www/prompts-acme; }
    location / { return 503; }
}
NGINX
else
    cp nginx.conf /etc/nginx/sites-available/family-prompts
fi
ln -sf /etc/nginx/sites-available/family-prompts /etc/nginx/sites-enabled/family-prompts
nginx -t
systemctl reload nginx
chmod 700 /opt/family-prompts/backup.sh
printf '17 9 * * * root /opt/family-prompts/backup.sh\n' > /etc/cron.d/family-prompts-backup
install -d /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nnginx -t && systemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/family-prompts-nginx
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/family-prompts-nginx
printf 'Installation complete. HTTPS activation requires the DNS A record.\n'
