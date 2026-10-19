// Type-checks the `## Example` blocks of docs/notes against the real source: every example is a tiny module placed next to
// the package (virtual files, nothing is written), resolved through the same path mapping the playground uses. A wrong prop
// name, a missing import or a value of the wrong type fails here, so the examples shipped to agents are known to compile.
import path from "node:path";
import ts from "typescript";

/** Returns `[{ name, line, message }]` for the notes' examples (all, or only the named notes). */
export function checkNoteExamples({ root, notes, only }) {
  const entries = [...notes.entries()].filter(([name, note]) => note.example && (!only || only.includes(name)));
  if (entries.length === 0) return [];
  const configPath = path.join(root, "tsconfig.json");
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, root);
  const src = (p) => [`src/${p}.ts`, `src/${p}.tsx`];
  const options = {
    ...parsed.options,
    noEmit: true,
    types: [],
    baseUrl: root,
    paths: {
      "@sutra/ui": ["src/index.ts"],
      "@sutra/ui/primitives/*": src("primitives/*"),
      "@sutra/ui/patterns/*": src("patterns/*"),
      "@sutra/ui/kits/*": src("kits/*"),
      "@sutra/ui/blocks/*": src("blocks/*"),
      "@sutra/ui/assets/*": src("assets/*"),
      "@sutra/ui/*": ["src/entries/*.ts"],
    },
  };
  const dir = path.join(root, "test/.note-examples");
  const virtual = new Map(entries.map(([name, note]) => [path.join(dir, `${name}.tsx`), note.example]));
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, languageVersion, ...rest) =>
    virtual.has(file) ? ts.createSourceFile(file, virtual.get(file), languageVersion, true, ts.ScriptKind.TSX) : getSourceFile(file, languageVersion, ...rest);
  const fileExists = host.fileExists.bind(host);
  host.fileExists = (file) => virtual.has(file) || fileExists(file);
  const readFile = host.readFile.bind(host);
  host.readFile = (file) => (virtual.has(file) ? virtual.get(file) : readFile(file));
  const program = ts.createProgram({ rootNames: [...virtual.keys()], options, host });
  const out = [];
  for (const [file] of virtual) {
    const sf = program.getSourceFile(file);
    if (!sf) continue;
    for (const d of [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)]) {
      const { line } = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : { line: 0 };
      out.push({ name: path.basename(file, ".tsx"), line: line + 1, message: ts.flattenDiagnosticMessageText(d.messageText, "\n").split("\n")[0] });
    }
  }
  return out;
}
