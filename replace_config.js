const fs = require('fs');

const configStoreImport = `import { getConfig, setConfig } from '@/lib/configStore';\n`;

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('getConfig')) {
    const importMatch = content.match(/import .*?;/g);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      content = content.replace(lastImport, lastImport + '\n' + configStoreImport);
    }
  }

  // Replace localStorage.getItem with getConfig
  content = content.replace(/localStorage\.getItem\('([^']+)'\)/g, `getConfig('$1')`);
  
  // Replace localStorage.setItem with setConfig
  content = content.replace(/localStorage\.setItem\('([^']+)',\s*(.*?)\)/g, `setConfig('$1', $2)`);

  fs.writeFileSync(filePath, content);
  console.log('Patched', filePath);
}

['desktop/src/pages/SettingsPage.tsx', 
 'desktop/src/pages/CheckoutPage.tsx', 
 'desktop/src/pages/ReportsPage.tsx',
 'desktop/src/lib/translations.ts',
 'desktop/src/lib/printerStore.ts',
 'desktop/src/lib/offlineStore.ts'].forEach(patchFile);
