import { fromFileUrl } from "@std/path/from-file-url";
import { dirname } from "@std/path/dirname";
import { findImportMap } from "./finder.ts";
import { rewriteImports } from "./rewrite_imports.ts";

async function readRefinedContent(
  specifier: string,
  path: string,
): Promise<string> {
  path = fromFileUrl(path);
  const content = await Deno.readTextFile(path);
  const importMap = await findImportMap(dirname(path));
  if (!importMap || !importMap.imports) {
    console.log(`No import map found for '${path}'`);
    return content;
  }
  console.log(`Import map found for '${path}': '${importMap.path}'`);
  return rewriteImports(specifier, content, importMap.imports);
}

export default {
  async fetch(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const path = url.pathname.replace(/^\//, "");
      if (!path.startsWith("file:///")) {
        return new Response("Bad Request", { status: 400 });
      }
      const content = await readRefinedContent(url.href, path);
      return new Response(content, {
        headers: {
          "content-type": "text/plain",
        },
      });
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return new Response("Not Found", { status: 404 });
      }
      if (err instanceof Deno.errors.PermissionDenied) {
        return new Response("Permission denied", { status: 403 });
      }
      console.error(`Failed to serve '${req.url}':`, err);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
