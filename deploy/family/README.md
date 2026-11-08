# Li Family Prompts

Dedicated upstream prompts.chat deployment at `https://prompts.li-family.us`.
Independent of the Flask services; do not add it to their restart loop.

## Prepared configuration

- Official app container plus PostgreSQL 17 with a persistent named volume.
- App listens only on loopback; PostgreSQL has no published port.
- English/Chinese UI and family branding; paid AI integrations disabled.
- Every HTTPS path, including APIs and registration, requires a per-person nginx
  access credential. Invited people can register their separate application
  accounts after passing that gate. This uses two logins, not email invitations.
- App image must be pinned by digest after pulling the official image.
- Default app memory budget is 1280 MB plus 256 MB for PostgreSQL. Deployment
  targets a separate 2 GB AWS Lightsail instance, with 2 GB swap and no local build.
  The existing family applications remain on their own EC2 host.

## First installation

1. Install Docker Engine, its Compose plugin, nginx, certbot, and `htpasswd`.
2. Copy this directory to `/opt/family-prompts`, owned by root.
3. Create a root-only `.env` (mode 600). Generate independent random hex values
   for `POSTGRES_PASSWORD` and `AUTH_SECRET` (`openssl rand -hex 32` each). Set
   `PROMPTS_IMAGE=ghcr.io/f/prompts.chat@sha256:<tested-digest>`.
4. Create `/etc/nginx/prompts-users` with `htpasswd -c` for the first invited
   person (interactive password entry), owner root, group www-data on Ubuntu (nginx on Amazon Linux), mode 640.
   Use `htpasswd /etc/nginx/prompts-users USERNAME` without `-c` to add others;
   use `htpasswd -D` to revoke their site access. Do not put passwords in argv.
5. Start `docker compose up -d` and verify `http://127.0.0.1:4444/api/health`.
   Upstream automatically migrates only this new PostgreSQL database on startup.
6. Add the DNS A record pointing at the selected host. Configure an HTTP-only
   nginx ACME location rooted at `/var/www/prompts-acme`, returning 503 elsewhere.
   Run `certbot certonly --webroot -w /var/www/prompts-acme
   -d prompts.li-family.us` with the domain owner's ACME contact email.
7. Install `nginx.conf`, run `nginx -t`, then reload nginx. Configure certbot's
   successful-renewal hook to reload nginx.
8. Verify HTTPS returns 401 without credentials for both `/` and `/api/prompts`;
   verify authenticated health, signup, login, prompt creation and persistence.
9. Schedule `backup.sh` daily as root. Local 14-day snapshots do not survive host
   loss; configure encrypted off-host backups before storing irreplaceable data.

## Updates and recovery

Back up first. Pull a selected upstream image, record its immutable digest in
`.env`, and run `docker compose up -d`. Recheck authentication and persistence.
Image rollback alone cannot undo upstream database migrations; preserve the
pre-update database snapshot. Never run `docker compose down -v` on this service.

This is a separate server, outside the shared Flask deployment coordinator.
Host replacement will require restoring the Compose files,
root-only secrets, nginx access file, and an off-host database backup.

## Approved AWS plan

Region: us-west-2. Lightsail Linux IPv4 bundle `small_3_0`: $12/month,
2 GB RAM, 2 vCPUs, 60 GB SSD, and 3 TB monthly transfer. Price verified with
`aws lightsail get-bundles` on 2026-11-07 (America/Los_Angeles). Taxes,
snapshots, backup storage and transfer overages are additional. The owner approved this $12/month plan on 2026-11-07. Resource creation and
live verification are tracked in the root README deployment status.

DNS is managed in the owner's Squarespace account. After assigning a static IP
to the new server, add only the `prompts` A record. Leave existing records alone.
The owner authorized using their existing Safari session for this DNS update.

## First-run installer

On Ubuntu 24.04, copy `compose.yml`, `nginx.conf`, `backup.sh`, and `install.sh`
to `/opt/family-prompts`, then run `sudo bash /opt/family-prompts/install.sh`.
The script installs packages, creates 2 GB swap when absent, generates persistent
secrets, pins the official image digest, starts the stack, installs daily local
backups, and serves ACME challenges over HTTP. Until a certificate is installed,
all other HTTP paths return 503.

Initial invitation credentials are in `/root/family-prompts-access.txt` (root-only).
The installer does not print them or create an application account.

Lightsail prepends shell initialization to user data. Wrap a Bash bootstrap
explicitly in `bash <<'BOOTSTRAP' ... BOOTSTRAP`; do not depend on a second
shebang being honored by its outer `/bin/sh`.

## Verified deployment

The live instance is `family-prompts` in `us-west-2a`, static IP `32.184.201.132`.
See the root README for the tested image digest and live verification results.
HTTPS, invitation access, password signup/login, persistent database storage,
daily local backups, and a disposable backup restore have been verified.

For administration, use Lightsail's browser SSH or temporary SSH certificate
access with port 22 restricted to your current source IP. Public ports 80 and
443 are the only permanent inbound rules. The deployment's temporary SSH rule
is removed after setup.
