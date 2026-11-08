# Li Family Prompts

Our private family prompt library, self-hosted from [prompts.chat](https://github.com/f/prompts.chat).

- **Site:** https://prompts.li-family.us
- **Repository:** https://github.com/Papersboys/prompts.chat
- **Languages:** English and Chinese
- **Access:** Family and invited users; the entire site requires an invitation credential.
- **Hosting:** A separate AWS Lightsail server in Oregon (`us-west-2`), approved at $12/month before taxes, backups, and usage overages.

## Using the library

Enter your invitation username and password when the browser asks. Then register
an application account to create, organize, and save prompts. These are separate
logins: the invitation credential protects the whole site, while the application
account owns your saved content. Do not share invitation credentials publicly.

The server has its own PostgreSQL database. It does not send your prompts to
AI providers by default; optional AI search and generation are disabled.

## Run locally

Requires Node.js 24, npm, and PostgreSQL.

```bash
npm ci
cp .env.example .env
# Set DATABASE_URL and AUTH_SECRET, then configure authentication.
npm run setup
npm run db:deploy
npm run dev
```

Local development does not include the production nginx invitation gate.
Do not expose the development server publicly.

## Production operations

See [deployment and recovery instructions](deploy/family/README.md) for the
Compose stack, HTTPS proxy, invitation access, backups, and updates.

The application and database run in separate containers. Only nginx exposes
public ports; the app binds to loopback and PostgreSQL has no published port.
App images are pinned by digest. Database storage persists across restarts.
Never run `docker compose down -v` on the production stack.

Secrets stay in the root-only server `.env` and invitation file. Never commit
passwords, authentication secrets, database exports, or private keys.

## Upstream

The source is based on upstream revision `ba34d09010de8e0f4cf1e75a87972be30497f975`.
The original [upstream README](README.upstream.md), [self-hosting guide](SELF-HOSTING.md),
and [Docker guide](DOCKER.md) are retained. Source code uses the upstream MIT
license; the prompt dataset uses CC0. See the LICENSE files for details.

## Deployment status

Live and verified on 2026-11-07 (America/Los_Angeles).

| Item | Value |
| --- | --- |
| AWS instance | `family-prompts` (Lightsail, `us-west-2a`) |
| Plan | `small_3_0`, $12/month before extras |
| Static IPv4 | `32.184.201.132` (`family-prompts-ip`) |
| DNS | Squarespace A record: `prompts` → `32.184.201.132` |
| HTTPS certificate | Let's Encrypt; initial expiry 2027-02-06; automatic renewal |
| Server directory | `/opt/family-prompts` |
| App image | `ghcr.io/f/prompts.chat@sha256:037087f75ee84a10ad96ed86e1577f92048727ab7df6460660920fc64a9bc6d6` |
| Memory limits | App 1280 MB; database 256 MB; host has 2 GB RAM plus 2 GB swap |
| Backups | Daily 09:17 UTC, 14-day local retention |

Verified HTTPS, unauthenticated homepage/API rejection, authenticated health and
page rendering, account registration, password login, persistence across an app
restart, and restoring a backup into a disposable database. The verification
account and restore database were removed.

Initial invitation credentials are stored in `/root/family-prompts-access.txt` on
the server. They are not part of this repository. Once invited, register your
own application account at the site.

**Backup limitation:** backups currently stay on this server. They do not protect
against host or disk loss; encrypted off-host backups are not configured.

## Imported local library

On 2026-11-08, a reviewed local scan imported 1,777 records under `liyuanxi23`:
1,601 skill definitions, 165 agent/instruction documents, and 11 saved prompts.
The latter two groups are TEXT records; no runnable bots were fabricated or
started. Entries are visible to people who can pass the family invitation gate.

Apple/work-specific and unclassified project material, suspected credentials,
and duplicate/older copies were excluded. Original instruction text and source
labels were preserved. Companion scripts/assets remain in their original local
folders; this imports a catalog of definitions, not installed executable bundles.

See [the reviewed import tool](scripts/local-library/README.md). Import payloads
and private local review inventories are not part of this repository. The import
verified every stored content hash and confirmed that a repeat dry-run creates
zero duplicates.
