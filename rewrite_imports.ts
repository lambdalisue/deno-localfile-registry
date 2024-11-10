import { init, parseModule } from "@deno/graph";
import type { DependencyJson } from "@deno/graph/types";
import { detect, EOL } from "@std/fs/eol";

const encoder = new TextEncoder();

type Replacement = {
  line: number;
  start: number;
  end: number;
  repl: string;
};

function buildReplacements(
  dependencies: DependencyJson[],
  imports: Record<string, string>,
): Replacement[] {
  const importEntries = Object.entries(imports);
  return dependencies
    .map((dep) => {
      for (const [before, after] of importEntries) {
        if (dep.code && dep.specifier?.startsWith(before)) {
          const line = dep.code.span.start.line;
          const start = dep.code.span.start.character + 1;
          const end = dep.code.span.end.character - 1;
          const repl = after + dep.specifier.slice(before.length);
          return { line, start, end, repl };
        }
      }
      return;
    })
    .filter((v) => !!v);
}

export async function rewriteImports(
  specifier: string,
  content: string,
  imports: Readonly<Record<string, string>>,
): Promise<string> {
  await init();
  const mod = await parseModule(
    specifier,
    encoder.encode(content),
  );
  if (!mod.dependencies) {
    return content;
  }
  const eol = detect(content) ?? EOL;
  const lines = content.split(eol);
  buildReplacements(mod.dependencies, imports)
    .forEach(({ line, start, end, repl }) => {
      const text = lines[line];
      lines[line] = text.slice(0, start) + repl + text.slice(end);
    });
  return lines.join(eol);
}
