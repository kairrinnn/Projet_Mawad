const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'src', 'app', 'api');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file === 'route.ts') {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('process.env.DATABASE_URL === "mock"')) {
        console.log(`Fixing ${fullPath}`);
        content = content.replace(/process\.env\.DATABASE_URL === "mock"/g, 'process.env.DATABASE_URL?.includes("mock")');
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

walk(apiDir);
console.log('Done.');
