import ts from 'typescript'
import fs from 'fs'

const file = 'src/pages/PublicMenuView.tsx'
const code = fs.readFileSync(file, 'utf-8')
const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

function logErrors() {
  const diagnostics = sourceFile.parseDiagnostics
  if (diagnostics.length > 0) {
    diagnostics.forEach(diagnostic => {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(diagnostic.start)
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      console.log(`Error at ${line + 1}:${character + 1}: ${message}`)
    })
  } else {
    console.log("No syntax errors found by TS parser!")
  }
}
logErrors()
