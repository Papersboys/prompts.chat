/** Import a reviewed local-library payload. Run inside the deployed app container.
 * Only creates new records for an existing account; never replaces user content.
 * No source discovery or upload occurs here. Back up before running with --apply.
 */
const fs = require('node:fs');
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const digest = s => crypto.createHash('sha256').update(s.replace(/\r\n/g, '\n')).digest('hex');
const db = new PrismaClient();
async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Provide reviewed payload JSON path');
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (payload.schemaVersion !== 1 || typeof payload.ownerUsername !== 'string' || typeof payload.isPrivate !== 'boolean' || !Array.isArray(payload.records)) throw new Error('Invalid payload envelope');
  const owner = await db.user.findUnique({ where: { username: payload.ownerUsername }, select: { id: true, username: true } });
  if (!owner) throw new Error('Existing owner account not found');
  const ids = new Set();
  for (const r of payload.records) {
    const expectedId = 'localimport_' + crypto.createHash('sha256').update(owner.username + ':' + r.sha256).digest('hex').slice(0, 32);
    if (r.id !== expectedId || ids.has(r.id) || !['SKILL','TEXT'].includes(r.type) || !['Skills','Saved Prompts','Agent Instructions'].includes(r.category) || typeof r.content !== 'string' || !r.content.trim() || digest(r.content) !== r.sha256 || !r.title || r.title.length > 200 || r.description.length > 500) throw new Error('Invalid or duplicate import record');
    ids.add(r.id);
  }
  const existing = await db.prompt.findMany({ where: { authorId: owner.id }, select: { id: true, content: true } });
  const existingIds = new Map(existing.map(r => [r.id, r]));
  const existingHashes = new Set(existing.map(r => digest(r.content)));
  const pending = payload.records.filter(r => !existingIds.has(r.id) && !existingHashes.has(r.sha256));
  const skipped = payload.records.length - pending.length;
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', owner: owner.username, selected: payload.records.length, pending: pending.length, skipped }));
  if (!process.argv.includes('--apply')) return;
  const categoryIds = {};
  for (const name of [...new Set(pending.map(r => r.category))]) {
    const slug = 'local-import-' + name.toLowerCase().replace(/ /g, '-');
    const category = await db.category.upsert({ where: { slug }, update: {}, create: { name, slug, description: 'Reviewed definitions imported from local files' } });
    categoryIds[name] = category.id;
  }
  const tag = await db.tag.upsert({ where: { slug: 'local-import' }, update: {}, create: { name: 'Local import', slug: 'local-import' } });
  let created = 0;
  for (let offset = 0; offset < pending.length; offset += 50) {
    const batch = pending.slice(offset, offset + 50);
    await db.$transaction(async tx => {
      await tx.prompt.createMany({ data: batch.map(r => ({ id: r.id, title: r.title, slug: r.slug, description: r.description, content: r.content, type: r.type, isPrivate: payload.isPrivate, authorId: owner.id, categoryId: categoryIds[r.category], bestWithModels: [], bestWithMCP: [] })) });
      await tx.promptVersion.createMany({ data: batch.map(r => ({ promptId: r.id, version: 1, content: r.content, changeNote: 'Imported from reviewed local definition', createdBy: owner.id })) });
      await tx.promptTag.createMany({ data: batch.map(r => ({ promptId: r.id, tagId: tag.id })) });
    }, { maxWait: 10000, timeout: 30000 });
    created += batch.length;
    if (created % 250 === 0 || created === pending.length) console.log(JSON.stringify({ created }));
  }
  const stored = await db.prompt.findMany({ where: { id: { in: payload.records.map(r => r.id) }, authorId: owner.id }, select: { id: true, content: true, type: true, isPrivate: true } });
  const wanted = new Map(payload.records.map(r => [r.id,r]));
  for (const r of stored) {
    const expected = wanted.get(r.id);
    if (digest(r.content) !== expected.sha256 || r.type !== expected.type || r.isPrivate !== payload.isPrivate) throw new Error('Stored content verification failed');
  }
  const summary = { created, skipped, verifiedStored: stored.length, counts: stored.reduce((a,r) => ({...a,[r.type]:(a[r.type]||0)+1}),{}) };
  console.log(JSON.stringify(summary));
  fs.writeFileSync('/tmp/local-library-import-result.json', JSON.stringify(summary,null,2));
}
main().catch(e => { console.error('Import failed:', e.code || e.name, String(e.message).slice(0,500)); process.exitCode=1; }).finally(() => db.$disconnect());
