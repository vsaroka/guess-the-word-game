/* Publishes src/ to the gh-pages branch (GitHub Pages).
   Usage: npm run deploy
   Steps: stamp version -> commit the stamp if it changed -> push main -> push src/ to gh-pages. */
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const run = cmd => execSync(cmd, { cwd: root, stdio: 'inherit' });
const out = cmd => execSync(cmd, { cwd: root }).toString().trim();

if (out('git status --porcelain --untracked-files=no -- . ":!src/js/version.js"')) {
  console.error('Uncommitted changes found. Commit them first, then run the deploy again.');
  process.exit(1);
}

run('node scripts/stamp-version.js');
if (out('git status --porcelain -- src/js/version.js')) {
  run('git add src/js/version.js');
  run('git commit -m "Stamp version for deploy"');
}
run('git push origin main');
run('git subtree push --prefix src origin gh-pages');
console.log('\nDeployed. Pages updates within a minute or two.');
