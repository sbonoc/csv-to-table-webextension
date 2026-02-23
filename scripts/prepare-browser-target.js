#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TARGETS = {
  firefox: {
    status: 'implemented',
    manifestPath: path.join('manifests', 'firefox', 'manifest.json')
  },
  chrome: {
    status: 'pending',
    notesPath: path.join('manifests', 'chrome', 'PENDING.md')
  },
  edge: {
    status: 'pending',
    notesPath: path.join('manifests', 'edge', 'PENDING.md')
  }
};

const requestedTarget = (process.argv[2] || process.env.TARGET_BROWSER || 'firefox').toLowerCase();
const selectedTarget = TARGETS[requestedTarget];

if (!selectedTarget) {
  const validTargets = Object.keys(TARGETS).join(', ');
  console.error(`[target] Unsupported browser "${requestedTarget}". Valid targets: ${validTargets}`);
  process.exit(1);
}

if (selectedTarget.status !== 'implemented') {
  console.error(`[target] Browser target "${requestedTarget}" is marked as pending.`);
  console.error(`[target] Tracking notes: ${selectedTarget.notesPath}`);
  process.exit(1);
}

const sourceManifestPath = path.resolve(selectedTarget.manifestPath);
const destinationManifestPath = path.resolve('manifest.json');

if (!fs.existsSync(sourceManifestPath)) {
  console.error(`[target] Manifest not found: ${selectedTarget.manifestPath}`);
  process.exit(1);
}

const sourceManifest = fs.readFileSync(sourceManifestPath, 'utf8');
const currentManifest = fs.existsSync(destinationManifestPath)
  ? fs.readFileSync(destinationManifestPath, 'utf8')
  : '';

if (sourceManifest !== currentManifest) {
  fs.writeFileSync(destinationManifestPath, sourceManifest);
}

console.log(`[target] Active browser target: ${requestedTarget}`);
console.log(`[target] Manifest synced from ${selectedTarget.manifestPath} -> manifest.json`);
