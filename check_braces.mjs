import fs from 'fs'

const code = fs.readFileSync('src/pages/PublicMenuView.tsx', 'utf-8')
const lines = code.split('\n')

let open = 0
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  if (line === undefined) continue
  
  const cleanLine = line.replace(/\/\/.*/, '').replace(/'[^']*'/g, '').replace(/"[^"]*"/g, '').replace(/`[^`]*`/g, '')
  const opens = (cleanLine.match(/\{/g) || []).length
  const closes = (cleanLine.match(/\}/g) || []).length
  
  open += opens - closes
  if (i > 330 && i <= 505) {
     console.log(`${i+1}: [${open}] ${line}`)
  }
}
