const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const seedPath = path.join(projectRoot, 'src', 'db', 'seed.ts');
const assetIndexPath = path.join(projectRoot, 'src', 'assets', 'assets_index.ts');

function readSource(filePath) {
  return ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function unwrapExpression(expression) {
  let current = expression;

  while (
    ts.isAsExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    current.kind === ts.SyntaxKind.SatisfiesExpression
  ) {
    current = current.expression;
  }

  return current;
}

function getPropertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }

  return undefined;
}

function collectSeedAssetKeys(sourceFile) {
  const assetKeys = [];

  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      getPropertyName(node.name) === 'asset_key' &&
      ts.isStringLiteral(node.initializer)
    ) {
      assetKeys.push(node.initializer.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return assetKeys;
}

function collectExerciseGifMappings(sourceFile) {
  const mappings = [];

  function visit(node) {
    if (!ts.isVariableDeclaration(node) || node.name.getText() !== 'ExerciseGifs') {
      ts.forEachChild(node, visit);
      return;
    }

    const initializer = node.initializer
      ? unwrapExpression(node.initializer)
      : undefined;

    if (!initializer || !ts.isObjectLiteralExpression(initializer)) {
      return;
    }

    for (const property of initializer.properties) {
      if (!ts.isPropertyAssignment(property)) {
        continue;
      }

      const key = getPropertyName(property.name);
      const callExpression = unwrapExpression(property.initializer);

      if (!key) {
        mappings.push({
          key: property.name.getText(),
          path: null,
          isStaticRequire: false,
        });
        continue;
      }

      if (
        ts.isCallExpression(callExpression) &&
        callExpression.expression.getText(sourceFile) === 'require' &&
        callExpression.arguments.length === 1 &&
        ts.isStringLiteral(callExpression.arguments[0])
      ) {
        mappings.push({
          key,
          path: callExpression.arguments[0].text,
          isStaticRequire: true,
        });
        continue;
      }

      mappings.push({ key, path: null, isStaticRequire: false });
    }
  }

  visit(sourceFile);
  return mappings;
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates].sort();
}

function formatList(values) {
  return values.length > 0 ? values.join(', ') : 'none';
}

const seedAssetKeys = collectSeedAssetKeys(readSource(seedPath));
const mappings = collectExerciseGifMappings(readSource(assetIndexPath));
const mappingKeys = mappings.map((mapping) => mapping.key);
const seedSet = new Set(seedAssetKeys);
const mappingSet = new Set(mappingKeys);

const missingMappings = [...seedSet]
  .filter((assetKey) => !mappingSet.has(assetKey))
  .sort();
const unusedMappings = [...mappingSet]
  .filter((assetKey) => !seedSet.has(assetKey))
  .sort();
const duplicateSeedKeys = findDuplicates(seedAssetKeys);
const duplicateMappingKeys = findDuplicates(mappingKeys);
const nonStaticMappings = mappings
  .filter((mapping) => !mapping.isStaticRequire)
  .map((mapping) => mapping.key)
  .sort();
const missingFiles = mappings
  .filter((mapping) => {
    if (!mapping.path) {
      return false;
    }

    return !fs.existsSync(path.resolve(path.dirname(assetIndexPath), mapping.path));
  })
  .map((mapping) => `${mapping.key} -> ${mapping.path}`)
  .sort();

const issues = [
  ['Seed asset_key missing from mapping', missingMappings],
  ['Mapping asset not used by seed', unusedMappings],
  ['Duplicate seed asset_key', duplicateSeedKeys],
  ['Duplicate mapping key', duplicateMappingKeys],
  ['Non-static require mapping', nonStaticMappings],
  ['Mapped file missing on disk', missingFiles],
].filter(([, values]) => values.length > 0);

console.log('Exercise asset consistency');
console.log(`Seed asset keys: ${seedAssetKeys.length}`);
console.log(`Mapped assets: ${mappingKeys.length}`);
console.log(`Missing mappings: ${formatList(missingMappings)}`);
console.log(`Unused mappings: ${formatList(unusedMappings)}`);
console.log(`Duplicate seed keys: ${formatList(duplicateSeedKeys)}`);
console.log(`Duplicate mapping keys: ${formatList(duplicateMappingKeys)}`);

if (issues.length > 0) {
  console.error('\nAsset consistency check failed:');
  for (const [label, values] of issues) {
    console.error(`- ${label}: ${formatList(values)}`);
  }
  process.exit(1);
}

console.log('Asset consistency check passed.');
