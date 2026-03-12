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

  // Replace `const session = await auth();\n  if (!session?.user?.id) { ... }` 
  // with a try/catch block if not already inside one.
  // A simpler proxy: just replace `const session = await auth();` with:
  // `let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed during build" }, { status: 500 }); }`

  const authRegex = /const session = await auth\(\);/g;
  
  if (authRegex.test(content)) {
    content = content.replace(authRegex, `let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(f, content);
    console.log('Fixed auth() in', f);
  }
});
