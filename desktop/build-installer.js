const { build } = require('electron-builder');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const config = yaml.load(fs.readFileSync(path.join(__dirname, 'electron-builder.yml'), 'utf8'));
const prepackagedPath = path.join(__dirname, 'out', 'Xona POS-win32-x64');

if (!fs.existsSync(prepackagedPath)) {
  console.error(`Prepackaged directory not found at: ${prepackagedPath}`);
  console.error('Please run "npx electron-forge package" first.');
  process.exit(1);
}

console.log('Building custom interactive NSIS installer using electron-builder...');

build({
  config,
  prepackaged: prepackagedPath,
}).then(result => {
  console.log('\n==========================================');
  console.log('  INSTALLER BUILD COMPLETED SUCCESSFULLY!');
  console.log('==========================================');
  console.log('Setup Executable Location:');
  console.log(`  ${result[1] || result[0]}`);
}).catch(err => {
  console.error('\nBuild error:', err);
  process.exit(1);
});
