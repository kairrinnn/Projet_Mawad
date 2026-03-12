const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('route.ts')) {
      results.push(file);
    }
  });
  return results;
};

const files = walk(path.join(process.cwd(), 'src/app/api'));

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  const methodRegex = /export async function (GET|POST|PUT|PATCH|DELETE)\s*\([^)]*\)\s*\{/g;
  
  if (methodRegex.test(content)) {
    content = content.replace(methodRegex, match => {
       // First replace any existing old ones
       return match;
    });
    // Replace old npm_lifecycle checks with BUILD_MODE
    content = content.replace(/if \(process\.env\.npm_lifecycle_event === "build"\) return NextResponse\.json\(\[\]\);/g, 'if (process.env.BUILD_MODE === "1") return NextResponse.json([]);');
    changed = true;
  }

  // Double check if NextResponse is imported
  if (changed && !content.includes('import { NextResponse')) {
     content = 'import { NextResponse } from "next/server";\n' + content;
  }

  if (changed) {
    fs.writeFileSync(f, content);
    console.log('Fixed build bypass in', f);
  }
});
