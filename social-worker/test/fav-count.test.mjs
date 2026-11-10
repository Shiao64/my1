import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const star = readFileSync(join(root, 'asia/atm-star.js'), 'utf8');
const home = readFileSync(join(root, 'asia/atm-home.js'), 'utf8');
let n = 0, failed = 0;
function check(name, ok) { n++; if (!ok) { failed++; console.error('FAIL', name); } }
check('listed counts favs', star.includes('listed: function () { return Object.keys(favs).length; }'));
check('syncSaved uses favCount', star.includes('function favCount() { return Object.keys(favs).length; }') && star.includes('savedText(favCount())'));
check('401 reloads local favs instead of wiping them', /if \(d\._s === 401\)[\s\S]{0,280}loadLocalFavs\(\)/.test(star) && !/if \(d\._s === 401\)[\s\S]{0,200}favs = \{\}/.test(star));
check('mine success merges local and server favs', /\(d\.favs \|\| \[\]\)\.forEach\(function \(fid\) \{ addLocalFav\(fid\); \}\);\s*loadLocalFavs\(\);/.test(star));
check('boot loads local favs before refreshMine', /loadLocalFavs\(\);\s*refreshMine\(\);/.test(star));
check('home listedSaved falls back to favIds', home.includes('favIds().length'));
check('home fav block hides strip when empty', home.includes("list.length ? '<div class=\"ah-strip\">'") || home.includes("list.length ? '<div class='"));
// the string in home is: list.length ? '<div class="ah-strip">'
check('home fav strip markup', home.includes("var strip = list.length ? '<div class=\"ah-strip\">'".replace(/\\"/g,'"')) || home.includes('class="ah-strip"'));
if (failed) { console.error(failed + '/' + n + ' failed'); process.exit(1); }
console.log('fav count ok');
