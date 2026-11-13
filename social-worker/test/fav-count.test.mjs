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
check('401 drops the mirrored favorites', /if \(d\._s === 401\)[\s\S]{0,360}atm_fav_v1/.test(star));
check('server favorites replace the local list', star.includes('function applyServerFavs') && star.includes('applyServerFavs(d.favs || [])'));
check('boot loads local favs before refreshMine', /loadLocalFavs\(\);\s*refreshMine\(\);/.test(star));
check('home listedSaved falls back to favIds', home.includes('favIds().length'));
check('home fav block hides strip when empty', home.includes("list.length ? '<div class=\"ah-strip\">'") || home.includes("list.length ? '<div class='"));
// the string in home is: list.length ? '<div class="ah-strip">'
check('home fav strip markup', home.includes("var strip = list.length ? '<div class=\"ah-strip\">'".replace(/\\"/g,'"')) || home.includes('class="ah-strip"'));
check('tombstone helpers exist', star.includes("atm_fav_removed_v1") && star.includes('function isRemoved') && star.includes('function markRemoved') && star.includes('function unmarkRemoved') && star.includes('function requestUnfav') && star.includes('function seriesFavIds'));
check('favorite writes use the account and do not cancel a going intent here', star.includes("'/social/going/fav'") && star.includes("'/social/going/unfav'") && star.includes('function accountFav') && star.includes('function removeLocalFav'));
check('an anonymous star asks for the shared sheet', star.includes("askLogin('fav'") && star.includes("toastOn: '已收藏'") && star.includes("toastOff: 'Removed from saved'"));
check('addLocalFav clears tombstone', /function addLocalFav\([\s\S]*unmarkRemoved\(id\)/.test(star));
check('loadLocalFavs drops tombstoned ids', /function loadLocalFavs\([\s\S]*rem\.indexOf\(id\) < 0/.test(star));
if (failed) { console.error(failed + '/' + n + ' failed'); process.exit(1); }
console.log('fav count ok');
