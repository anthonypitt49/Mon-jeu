// Assemble src/ parts into the single deliverable file.
// `node build.mjs` → index.html à la racine du dépôt (le jeu en ligne sur GitHub Pages) ;
// `node build.mjs out.html` → page complète ailleurs ; `node build.mjs out.html --artifact` → contenu sans squelette (Artifact claude.ai).
import fs from 'fs';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const src = path.join(dir, 'src');
const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(dir, '..', 'index.html');
const artifact = process.argv.includes('--artifact');
let html = fs.readFileSync(path.join(src, 'shell.html'), 'utf8');
const jsParts = fs.readdirSync(src).filter(f => f.endsWith('.js')).sort();
const js = jsParts.map(f => `// ───────────────────────── ${f.replace(/^\d+_/, '').replace('.js', '').toUpperCase()} ─────────────────────────\n` + fs.readFileSync(path.join(src, f), 'utf8')).join('\n\n');
if (artifact) {
  // Le lecteur claude.ai fournit doctype, <html>, <head>, <body>, charset et viewport : le titre et le style viennent en premier.
  html = html
    .replace(/<!DOCTYPE html>\s*/i, '')
    .replace(/<html[^>]*>\s*/i, '')
    .replace(/<head>\s*/i, '')
    .replace(/<meta charset="UTF-8">\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '')
    .replace(/<link rel="icon"[^>]*>\s*/i, '')
    .replace(/<\/head>\s*/i, '')
    .replace(/<body>\s*/i, '')
    .replace(/\s*<\/body>\s*<\/html>\s*$/i, '\n');
}
const result = html.replace('/*__GAME_JS__*/', () => js);
fs.writeFileSync(out, result);
console.log('built', out, (result.length / 1024).toFixed(1) + ' KB', jsParts.length + ' js parts', artifact ? '(artifact)' : '');
