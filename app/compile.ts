import { readFile } from "node:fs/promises";
import ts from "typescript";

/**
 * page.tsx compiles the runtime on the server and passes it to Studio for SVG export.
 * Keep runtime.ts self-contained, with only type imports; the compiler stays outside the browser bundle.
 * In development, reload after editing runtime.ts and before exporting to refresh this file read.
 * Production builds always compile the current source.
 */
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
