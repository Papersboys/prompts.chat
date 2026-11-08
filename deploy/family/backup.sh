#!/usr/bin/env bash
# Root-owned local snapshots; copy off-host before relying on disaster recovery.
set -euo pipefail
umask 077
cd /opt/family-prompts
install -d -m 700 backups
backup="backups/prompts-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
trap 'rm -f "$backup.tmp"' EXIT
docker compose exec -T db pg_dump -U prompts --no-owner prompts | gzip > "$backup.tmp"
gzip -t "$backup.tmp"
mv "$backup.tmp" "$backup"
find backups -name 'prompts-*.sql.gz' -mtime +14 -delete
