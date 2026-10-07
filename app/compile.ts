/** Runs in the Server Component during Next.js development and static generation. */
import { readFile } from "node:fs/promises";
import ts from "typescript";

export async function compileRuntime(): Promise<string> {
  const source = await readFile(`${process.cwd()}/app/runtime.ts`, "utf8");
  const file = ts.createSourceFile("runtime.ts", source, ts.ScriptTarget.ES2020, true);
  const check = (node: ts.Node) => {
    if ((ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) ||
        (ts.isExportDeclaration(node) && node.moduleSpecifier && !node.isTypeOnly) ||
        ts.isImportEqualsDeclaration(node) ||
        (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === "require")))) {
      throw new Error("runtime.ts must be self-contained; only type-only imports are allowed.");
    }
    ts.forEachChild(node, check);
  };
  check(file);
  const output = ts.transpileModule(source, {
    fileName: "runtime.ts",
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      importHelpers: false,
      noEmitHelpers: false,
      removeComments: false,
    },
    reportDiagnostics: true,
  });
  const errors = output.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error);
  if (errors?.length) throw new Error(errors.map(item => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n"));
  return output.outputText;
}
