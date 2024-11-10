import { dirname } from "@std/path/dirname";
import { join } from "@std/path/join";
import {
  type ImportMap,
  parseImportMap,
  relocateImports,
} from "./import_map.ts";
import { AssertError } from "@core/unknownutil";

const filenames = [
  "import_map.json",
  "import-map.json",
  "deno.json",
  "deno.jsonc",
];

const importMapCache = new Map<string, Readonly<ImportMap> | undefined>();

export async function findImportMap(
  base: string,
): Promise<Readonly<ImportMap & { path: string }> | undefined> {
  if (importMapCache.has(base)) {
    return {
      path: base,
      ...importMapCache.get(base),
    };
  }
  for await (const path of climbUp(base)) {
    for (const filename of filenames) {
      try {
        const importMapPath = join(path, filename);
        const content = await Deno.readTextFile(importMapPath);
        const importMap = parseImportMap(content);
        relocateImports(importMap, importMapPath, base);
        importMapCache.set(base, importMap);
        return {
          ...importMap,
          path: importMapPath,
        };
      } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
          continue;
        }
        if (err instanceof AssertError) {
          continue;
        }
        throw err;
      }
    }
  }
  importMapCache.set(base, undefined);
  return;
}

async function* climbUp(path: string): AsyncGenerator<string> {
  while (true) {
    yield path;
    const parent = dirname(path);
    if (parent === path) {
      return;
    }
    path = parent;
  }
}
