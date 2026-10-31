#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';

/**
 * Categorize semantic version diff
 */
function getUpdateType(current, latest) {
  if (!current || !latest) return 'unknown';
  const cleanCurrent = current.replace(/^[^0-9]*/, '');
  const cleanLatest = latest.replace(/^[^0-9]*/, '');

  const [cMaj, cMin, cPatch] = cleanCurrent.split('.').map((n) => parseInt(n, 10));
  const [lMaj, lMin, lPatch] = cleanLatest.split('.').map((n) => parseInt(n, 10));

  if (isNaN(cMaj) || isNaN(lMaj)) return 'other';
  if (lMaj > cMaj) return 'major';
  if (lMin > cMin) return 'minor';
  if (lPatch > cPatch) return 'patch';
  return 'patch';
}

function getBadge(type, isDeprecated) {
  if (isDeprecated) return '⚠️ deprecated';
  switch (type) {
    case 'major':
      return '🔴 major';
    case 'minor':
      return '🟡 minor';
    case 'patch':
      return '🟢 patch';
    default:
      return '⚪ other';
  }
}

function runOutdated() {
  try {
    const stdout = execSync('pnpm outdated --format json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
    });
    return JSON.parse(stdout || '{}');
  } catch (err) {
    // pnpm outdated exits with code 1 if there are outdated dependencies
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout.toString());
      } catch (parseErr) {
        console.error('Failed to parse pnpm outdated JSON output:', err.stdout.toString());
        throw parseErr;
      }
    }
    throw err;
  }
}

function main() {
  console.log('🔍 Checking for outdated packages via pnpm...\n');

  let outdatedData;
  try {
    outdatedData = runOutdated();
  } catch (error) {
    console.error('Error running pnpm outdated:', error.message);
    process.exit(1);
  }

  const entries = Object.entries(outdatedData || {}).map(([pkg, info]) => {
    const updateType = getUpdateType(info.current, info.latest);
    return {
      name: pkg,
      current: info.current || '-',
      wanted: info.wanted || '-',
      latest: info.latest || '-',
      isDeprecated: Boolean(info.isDeprecated),
      dependencyType: info.dependencyType || 'dependencies',
      updateType,
    };
  });

  const prodDeps = entries.filter((e) => e.dependencyType === 'dependencies');
  const devDeps = entries.filter((e) => e.dependencyType === 'devDependencies');
  const deprecatedDeps = entries.filter((e) => e.isDeprecated);
  const majorDeps = entries.filter((e) => e.updateType === 'major');
  const minorDeps = entries.filter((e) => e.updateType === 'minor');
  const patchDeps = entries.filter((e) => e.updateType === 'patch');

  console.log(`Found ${entries.length} outdated package(s):`);
  console.log(`  - 🔴 Major:      ${majorDeps.length}`);
  console.log(`  - 🟡 Minor:      ${minorDeps.length}`);
  console.log(`  - 🟢 Patch:      ${patchDeps.length}`);
  console.log(`  - ⚠️ Deprecated: ${deprecatedDeps.length}`);
  console.log(`  - 📦 Prod deps:  ${prodDeps.length}`);
  console.log(`  - 🛠️ Dev deps:   ${devDeps.length}\n`);

  if (entries.length === 0) {
    console.log('✨ All packages are up to date!');
  } else {
    console.table(
      entries.map((e) => ({
        Package: e.name,
        Current: e.current,
        Wanted: e.wanted,
        Latest: e.latest,
        Type: e.updateType,
        Scope: e.dependencyType === 'dependencies' ? 'prod' : 'dev',
        Deprecated: e.isDeprecated ? 'YES' : 'no',
      }))
    );
  }

  // Generate GitHub Step Summary if running in GitHub Actions
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const markdown = [];

    markdown.push('# 📦 Package Update Report');
    markdown.push('');
    markdown.push(`*Generated on ${new Date().toUTCString()}*`);
    markdown.push('');

    if (entries.length === 0) {
      markdown.push('### ✅ All dependencies are up to date! 🎉');
    } else {
      markdown.push('### 📊 Summary');
      markdown.push('| Metric | Count |');
      markdown.push('| --- | --- |');
      markdown.push(`| **Total Outdated** | **${entries.length}** |`);
      markdown.push(`| 🔴 Major Updates (Breaking) | ${majorDeps.length} |`);
      markdown.push(`| 🟡 Minor Updates | ${minorDeps.length} |`);
      markdown.push(`| 🟢 Patch Updates | ${patchDeps.length} |`);
      markdown.push(`| ⚠️ Deprecated Packages | ${deprecatedDeps.length} |`);
      markdown.push(`| 📦 Production Dependencies | ${prodDeps.length} |`);
      markdown.push(`| 🛠️ Dev Dependencies | ${devDeps.length} |`);
      markdown.push('');

      if (deprecatedDeps.length > 0) {
        markdown.push('> [!WARNING]');
        markdown.push('> **Deprecated Packages Detected**');
        markdown.push('> The following packages are deprecated and should be replaced or upgraded:');
        markdown.push('>');
        deprecatedDeps.forEach((dep) => {
          markdown.push(`> - \`${dep.name}\` (current: \`${dep.current}\`, latest: \`${dep.latest}\`)`);
        });
        markdown.push('');
      }

      const renderTable = (items, title) => {
        if (items.length === 0) return;
        markdown.push(`### ${title} (${items.length})`);
        markdown.push('');
        markdown.push('| Package | Current | Wanted | Latest | Type | Status |');
        markdown.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
        for (const item of items) {
          const badge = getBadge(item.updateType, item.isDeprecated);
          markdown.push(
            `| \`${item.name}\` | \`${item.current}\` | \`${item.wanted}\` | \`${item.latest}\` | ${badge} | ${
              item.isDeprecated ? '⚠️ **Deprecated**' : 'Active'
            } |`
          );
        }
        markdown.push('');
      };

      renderTable(prodDeps, '📦 Production Dependencies');
      renderTable(devDeps, '🛠️ Dev Dependencies');

      markdown.push('### 🚀 How to Update');
      markdown.push('To update dependencies locally:');
      markdown.push('```bash');
      markdown.push('# Update within compatible semantic version ranges');
      markdown.push('pnpm update');
      markdown.push('');
      markdown.push('# Interactively choose packages to update to latest:');
      markdown.push('pnpm update --interactive --latest');
      markdown.push('');
      markdown.push('# Update a specific package to latest:');
      markdown.push('pnpm update <package-name>@latest');
      markdown.push('```');
      markdown.push('');
    }

    try {
      appendFileSync(summaryPath, markdown.join('\n'), 'utf8');
      console.log('Successfully wrote report to GITHUB_STEP_SUMMARY.');
    } catch (err) {
      console.error('Failed to write to GITHUB_STEP_SUMMARY:', err);
    }
  }

  // Export GitHub Action step outputs if GITHUB_OUTPUT is defined
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath && existsSync(outputPath)) {
    try {
      const outputs = [
        `total_outdated=${entries.length}`,
        `has_updates=${entries.length > 0}`,
        `deprecated_count=${deprecatedDeps.length}`,
        `major_count=${majorDeps.length}`,
        `minor_count=${minorDeps.length}`,
        `patch_count=${patchDeps.length}`,
      ];
      appendFileSync(outputPath, outputs.join('\n') + '\n', 'utf8');
      console.log('Successfully wrote GitHub Action outputs.');
    } catch (err) {
      console.error('Failed to write to GITHUB_OUTPUT:', err);
    }
  }

  const failOnOutdated = process.env.FAIL_ON_OUTDATED === 'true';
  const failOnDeprecated = process.env.FAIL_ON_DEPRECATED === 'true';

  if (failOnDeprecated && deprecatedDeps.length > 0) {
    console.error(`\n❌ Failing due to ${deprecatedDeps.length} deprecated package(s) (FAIL_ON_DEPRECATED=true).`);
    process.exit(1);
  }

  if (failOnOutdated && entries.length > 0) {
    console.error(`\n❌ Failing due to ${entries.length} outdated package(s) (FAIL_ON_OUTDATED=true).`);
    process.exit(1);
  }

  console.log('\n✅ Package check completed successfully.');
}

main();
