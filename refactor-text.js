const fs = require('fs');
const path = require('path');

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      if (fullPath.includes('AppText.tsx')) continue;

      let content = fs.readFileSync(fullPath, 'utf8');
      
      const regex = /import\s+\{([\s\S]*?)\}\s+from\s+['"]react-native['"];?/;
      const match = content.match(regex);
      
      if (match) {
        let imports = match[1].split(',').map(s => s.trim()).filter(Boolean);
        if (imports.includes('Text')) {
           imports = imports.filter(i => i !== 'Text');
           
           let newImportStmt = '';
           if (imports.length > 0) {
             newImportStmt = `import { ${imports.join(', ')} } from 'react-native';\nimport { AppText as Text } from '@/src/components/AppText';`;
           } else {
             newImportStmt = `import { AppText as Text } from '@/src/components/AppText';`;
           }
           
           content = content.replace(match[0], newImportStmt);
           fs.writeFileSync(fullPath, content, 'utf8');
           console.log(`Updated ${fullPath}`);
        }
      }
    }
  }
}

processDir('/Users/nico/Documents/smartlist/src');
processDir('/Users/nico/Documents/smartlist/app');
