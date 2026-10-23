import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const temp=mkdtempSync(path.join(tmpdir(),'lac-test-'));
const out=path.join(temp,'bundle.cjs');
await build({entryPoints:['tests/entry.ts'],bundle:true,platform:'node',format:'cjs',outfile:out,alias:{obsidian:path.resolve('tests/mock-obsidian.ts')}});
const {Repository,createApp}=createRequire(import.meta.url)(out);
process.on('exit',()=>rmSync(temp,{recursive:true,force:true}));

test('TOML upgrade preserves Unicode, CRLF, quoted dates and inline address',()=>{
 const repo=new Repository(createApp(),'root.md');
 const parsed=repo.parseToml('name = "中文事件"\r\n[detail]\r\nstart_time = "2026-01-01 10:00"\r\naddress = { name = "公园", longitude = 116.4, latitude = 39.9 }');
 assert.equal(parsed.name,'中文事件');assert.equal(parsed.detail.start_time,'2026-01-01 10:00');assert.equal(parsed.detail.address.longitude,116.4);
});
test('save and reload preserve comments, unrelated fields and address',async()=>{
 const app=createApp(),repo=new Repository(app,'events/root.md');
 await app.vault.create('events/root.md','type = "root"\nrenders = ["lifeflow"]\n[[Event]]\n');
 const file=await app.vault.create('events/Event.md','# keep me\nname = "Event"\n[detail]\nstart_time = "2026-01-01 10:00"\naddress = { name = "公园", longitude = 116.4, latitude = 39.9 }\n[custom]\nnote = "keep"\n');
 const [story]=await repo.loadAll();assert.equal(story.name,'Event');story.description='Updated';await repo.saveStory(story);
 const saved=await app.vault.read(file);assert.match(saved,/# keep me/);assert.match(saved,/note = "keep"/);
 const [loaded]=await repo.loadAll();assert.equal(loaded.description,'Updated');assert.equal(loaded.address.longitude,116.4);
});
test('malformed TOML is rejected and the original file is not overwritten',async()=>{
 const app=createApp(),repo=new Repository(app,'events/root.md');
 const raw='name = "unterminated';const file=await app.vault.create('events/Event.md',raw);
 assert.throws(()=>repo.parseToml(raw));await repo.saveStory({id:'Event',name:'Event',description:'new'});
 assert.equal(await app.vault.read(file),raw);
});
test('new TOML parser rejects excessive nesting without prototype pollution',()=>{
 const repo=new Repository(createApp(),'root.md');
 assert.throws(()=>repo.parseToml('x = '+'['.repeat(600)+'0'+']'.repeat(600)));
 assert.equal({}.lac_review_polluted,undefined);
});
