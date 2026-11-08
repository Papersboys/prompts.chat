# Reviewed local-library import

`import.cjs` creates reviewed SKILL/TEXT records under an existing account, along
with categories, an import tag and initial content versions. It never promotes
an account, modifies authentication, replaces existing prompts, or starts bots.

Before running, inventory source files, deduplicate exact contents and old
versions, exclude work-specific material and suspected credentials, and create
a server database backup. Only the reviewed payload may be transferred.

Payload format: `schemaVersion: 1`, `ownerUsername`, `isPrivate`, and `records`.
Each record contains `id`, `title`, `slug`, `description`, `content`, `type`,
`category`, `source`, and normalized-content `sha256`. IDs are deterministic per
owner and content hash. Categories are Skills, Saved Prompts or Agent Instructions.
Do not commit payloads containing user files or the review inventories.

Run inside the existing app container, where Prisma and DATABASE_URL are already
configured:

```bash
node /app/import-local-library.cjs /app/local-library-import.json
node /app/import-local-library.cjs /app/local-library-import.json --apply
```

Dry-run is the default. Repeating an unchanged import skips existing records.
Each batch of 50 creates prompts, versions and tag links in one transaction.
Final verification compares stored content hashes, types and visibility.
Remove temporary payload/script files from the server and container afterward.
The original skill instructions are preserved as text; referenced companion
scripts and assets are not installed or executed by this catalog import.
