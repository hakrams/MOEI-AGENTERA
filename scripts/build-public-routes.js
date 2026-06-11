const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const routeCopies = [
  {
    id: "customer-housing-arrears",
    source: path.join(root, "challenge-1", "customer", "prototype"),
    destination: path.join(root, "customer", "housing-arrears"),
    requiredFiles: ["index.html", "app.js", "styles.css"]
  },
  {
    id: "office-housing-arrears",
    source: path.join(root, "challenge-1", "office", "prototype"),
    destination: path.join(root, "office", "housing-arrears"),
    requiredFiles: ["index.html", "app.js", "styles.css"]
  },
  {
    id: "shared-runtime",
    source: path.join(root, "challenge-1", "shared"),
    destination: path.join(root, "shared"),
    requiredFiles: [
      "workflow.js",
      "live-api-client.js",
      "contracts/assessment-result.schema.json",
      "contracts/case.schema.json",
      "contracts/document-completeness.schema.json",
      "contracts/financial-study.schema.json",
      "contracts/programme-loan.schema.json",
      "services/financial-study/assessment-orchestrator.js",
      "services/financial-study/audit-ledger-service.js",
      "services/financial-study/confidence-service.js",
      "services/financial-study/document-completeness-service.js",
      "services/financial-study/financial-capacity-service.js",
      "services/financial-study/programme-loan-service.js",
      "services/financial-study/recommendation-service.js",
      "services/financial-study/rescheduling-policy-service.js"
    ],
    excludedPaths: [
      "mock-data"
    ]
  }
];

function assertInsideRoot(targetPath) {
  const relative = path.relative(root, targetPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside project root: ${targetPath}`);
  }
}

function removeDestination(destination) {
  assertInsideRoot(destination);
  if (!fs.existsSync(destination)) return;

  const stat = fs.lstatSync(destination);
  if (stat.isSymbolicLink() || stat.isFile()) {
    fs.unlinkSync(destination);
    return;
  }

  if (stat.isDirectory()) {
    fs.rmSync(destination, { recursive: true, force: true });
    return;
  }

  throw new Error(`Unsupported destination type: ${destination}`);
}

function shouldExclude(route, sourcePath) {
  const relative = path.relative(route.source, sourcePath).replaceAll(path.sep, "/");
  if (path.extname(sourcePath).toLowerCase() === ".md") return true;
  return (route.excludedPaths || []).some((excludedPath) => (
    relative === excludedPath || relative.startsWith(`${excludedPath}/`)
  ));
}

function copyDirectory(route, source, destination) {
  assertInsideRoot(destination);
  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (shouldExclude(route, sourcePath)) continue;

    if (entry.isDirectory()) {
      copyDirectory(route, sourcePath, destinationPath);
      continue;
    }

    if (entry.isSymbolicLink()) {
      throw new Error(`Refusing to copy symlink from source route: ${sourcePath}`);
    }

    if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function assertRequiredFiles(route) {
  for (const requiredFile of route.requiredFiles) {
    const filePath = path.join(route.destination, requiredFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${route.id} missing required file after copy: ${requiredFile}`);
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      throw new Error(`${route.id} required path is not a file: ${requiredFile}`);
    }
    if (stat.size === 0) {
      throw new Error(`${route.id} required file is zero bytes: ${requiredFile}`);
    }
  }
}

function materializeRoute(route) {
  if (!fs.existsSync(route.source) || !fs.statSync(route.source).isDirectory()) {
    throw new Error(`${route.id} source directory missing: ${route.source}`);
  }

  removeDestination(route.destination);
  copyDirectory(route, route.source, route.destination);
  assertRequiredFiles(route);

  return {
    id: route.id,
    source: path.relative(root, route.source),
    destination: path.relative(root, route.destination),
    files: route.requiredFiles.length
  };
}

function main() {
  const built = routeCopies.map(materializeRoute);
  console.log("Package-safe public routes materialized");
  console.log(JSON.stringify({ built }, null, 2));
}

main();
