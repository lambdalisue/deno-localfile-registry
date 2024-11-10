import { parse } from "@std/jsonc/parse";
import { join } from "@std/path/join";
import { relative } from "@std/path/relative";
import { dirname } from "@std/path/dirname";
import { as, ensure, is, type Predicate } from "@core/unknownutil";

export type ImportMap = {
  imports?: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
};

export const isImportMap = is.ObjectOf({
  imports: as.Optional(is.RecordOf(is.String, is.String)),
  scopes: as.Optional(
    is.RecordOf(is.RecordOf(is.String, is.String), is.String),
  ),
}) satisfies Predicate<ImportMap>;

export function parseImportMap(content: string): ImportMap {
  return ensure(parse(content), isImportMap);
}

export function relocateImports(
  importMap: ImportMap,
  importMapPath: string,
  basePath: string,
): void {
  if (!importMap.imports) return;
  // Fix relative paths
  importMap.imports = Object.fromEntries(
    Object.entries(importMap.imports).map(([k, v]) => {
      if (v.startsWith(".")) {
        return [k, relative(basePath, join(dirname(importMapPath), v))];
      }
      return [k, v];
    }),
  );
}
