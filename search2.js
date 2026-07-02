const fs = require('fs');
const path = require('path');

function search(dir, regex) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') search(fullPath, regex);
    } else {
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (regex.test(content)) {
          console.log(fullPath);
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              console.log(`${i + 1}: ${lines[i]}`);
            }
          }
        }
      }
    }
  }
}

search('C:/Users/Kaleb/Desktop/loyalty-estrella', /vercel/i);
