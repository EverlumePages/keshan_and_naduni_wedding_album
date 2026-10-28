const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
const context = {window:{}};
vm.runInNewContext(read('album.config.js'),context);
const album = context.window.ALBUM;
const html = ['index.html','gallery.html','our-story.html','films.html'].map(read).join('\n');
for (const match of html.matchAll(/data-copy="([^"]+)"/g)) assert.ok(album.copy[match[1]],'Missing copy: ' + match[1]);
for (const match of html.matchAll(/data-image="([^"]+)"/g)) assert.ok(album.images[match[1]],'Missing image configuration: ' + match[1]);
for (const key of album.gallery) assert.ok(album.images[key],'Unknown gallery entry: ' + key);
assert.equal(new Set(album.gallery).size,album.gallery.length,'Duplicate gallery IDs');
for (const key of album.gallery) assert.ok(album.categories.some(c=>c.id===album.images[key].category),'Unknown category: '+key);
for (const chapter of album.chapters) { assert.ok(album.images[chapter.image] && album.images[chapter.secondImage]); assert.ok(chapter.text && chapter.sinhala); }
for (const film of album.films) {
  assert.ok(album.images[film.poster],'Missing film poster');
  if(film.source && !/^https:\/\//.test(film.source)) assert.ok(fs.existsSync(path.join(root,film.source)),'Missing local film: '+film.source);
}
for (const item of album.navigation) assert.ok(fs.existsSync(path.join(root,item.href)),'Missing linked page');
for (const asset of Object.values(album.images)) {
  assert.ok(asset.alt && asset.caption && asset.position,'Incomplete image metadata');
  for (const width of [480,960,1600]) assert.ok(fs.existsSync(path.join(root,album.assets.directory,`${asset.file}-${width}.jpg`)),'Missing optimized image: ' + asset.file + '-' + width);
}
for (const file of [album.assets.floral,album.assets.rings,album.assets.flowerBorder,...album.assets.petals]) assert.ok(fs.existsSync(path.join(root,file)),'Missing cutout: ' + file);
const manifest = JSON.parse(read('assets/generated/manifest.json'));
for (const asset of manifest.assets) {
  // Originals are kept locally and not committed; only check them when present.
  if (fs.existsSync(path.join(root,'assets/generated/originals'))) assert.ok(fs.existsSync(path.join(root,asset.original)),'Missing original: ' + asset.name);
  assert.ok(asset.prompt,'Missing generation prompt: ' + asset.name);
}
console.log(`Validated ${Object.keys(album.images).length} photo sets, ${manifest.assets.length} originals, gallery references and all configured copy.`);
