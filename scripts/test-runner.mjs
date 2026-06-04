import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const nativeRequire = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const moduleCache = new Map();
const testFilePattern = /\.test\.tsx?$/;
const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs"];

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function isDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function resolveAsFileOrDirectory(basePath) {
  if (isFile(basePath)) return basePath;

  for (const extension of sourceExtensions) {
    const candidate = `${basePath}${extension}`;
    if (isFile(candidate)) return candidate;
  }

  if (isDirectory(basePath)) {
    for (const extension of sourceExtensions) {
      const candidate = path.join(basePath, `index${extension}`);
      if (isFile(candidate)) return candidate;
    }
  }

  return null;
}

function resolveLocalModule(specifier, parentFile) {
  if (specifier.startsWith("@/")) {
    return resolveAsFileOrDirectory(
      path.join(rootDir, "src", specifier.slice(2)),
    );
  }

  if (specifier.startsWith(".")) {
    return resolveAsFileOrDirectory(
      path.resolve(path.dirname(parentFile), specifier),
    );
  }

  return null;
}

function loadModule(filename) {
  const resolvedFilename = path.resolve(filename);
  const extension = path.extname(resolvedFilename);

  if (![".ts", ".tsx"].includes(extension)) {
    return nativeRequire(resolvedFilename);
  }

  const cachedModule = moduleCache.get(resolvedFilename);
  if (cachedModule) return cachedModule.exports;

  const source = fs.readFileSync(resolvedFilename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: resolvedFilename,
  }).outputText;
  const mod = new Module(resolvedFilename);
  const parentRequire = createRequire(resolvedFilename);

  mod.filename = resolvedFilename;
  mod.paths = Module._nodeModulePaths(path.dirname(resolvedFilename));
  moduleCache.set(resolvedFilename, mod);

  function localRequire(specifier) {
    const localPath = resolveLocalModule(specifier, resolvedFilename);

    if (localPath) return loadModule(localPath);
    return parentRequire(specifier);
  }

  const wrapped = Module.wrap(output);
  const compiledWrapper = vm.runInThisContext(wrapped, {
    filename: resolvedFilename,
  });

  compiledWrapper.call(
    mod.exports,
    mod.exports,
    localRequire,
    mod,
    resolvedFilename,
    path.dirname(resolvedFilename),
  );

  return mod.exports;
}

function findTestFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const testFiles = [];

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;

    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      testFiles.push(...findTestFiles(entryPath));
      continue;
    }

    if (testFilePattern.test(entry.name)) {
      testFiles.push(entryPath);
    }
  }

  return testFiles.sort((a, b) => a.localeCompare(b));
}

async function main() {
  const testing = loadModule(path.join(rootDir, "src", "test", "testing.ts"));

  testing.clearRegisteredTests();

  const testFiles = findTestFiles(path.join(rootDir, "src"));

  for (const testFile of testFiles) {
    loadModule(testFile);
  }

  const tests = testing.getRegisteredTests();
  let failures = 0;

  for (const testCase of tests) {
    try {
      await testCase.run();
      console.log(`ok ${testCase.name}`);
    } catch (error) {
      failures += 1;
      console.error(`not ok ${testCase.name}`);
      console.error(error instanceof Error ? error.stack : error);
    }
  }

  console.log("");
  console.log(`${tests.length - failures}/${tests.length} tests passed`);

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
