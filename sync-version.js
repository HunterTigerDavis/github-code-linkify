import fs from 'fs';
import { execFileSync } from 'child_process';
import { createInterface } from 'readline/promises';
import { makeBadge } from 'badge-maker';

/**
 * Sync updated version and description from package.json to manifest.json, and generate a local SVG badge for the extension version
 */

function getBumpType() {
    const bumpIndex = process.argv.indexOf('--bump');
    return bumpIndex === -1 ? '' : process.argv[bumpIndex + 1];
}

function bumpVersion(version, bumpType) {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) {
        throw new Error(`Unsupported package version: ${version}`);
    }

    const [major, minor, patch] = match.slice(1).map(Number);

    if (bumpType === 'major') return `${major + 1}.0.0`;
    if (bumpType === 'minor') return `${major}.${minor + 1}.0`;
    if (bumpType === 'patch') return `${major}.${minor}.${patch + 1}`;

    throw new Error(`Unsupported bump type: ${bumpType}`);
}

// 1. Read the requested bump mode and the current package metadata.
const bumpType = getBumpType();
const packagePath = './package.json';
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// 2. Apply the requested major, minor, or patch version increment.
if (bumpType) {
    pkg.version = bumpVersion(pkg.version, bumpType);
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`📦 Version bumped to v${pkg.version}.`);
}

console.log(`⏳ Syncing configuration files for v${pkg.version}...`);

// 3. Mirror package metadata into the Chrome extension manifest.
try {
    if (fs.existsSync('./manifest.json')) {
        const manifest = JSON.parse(fs.readFileSync('./manifest.json', 'utf8'));
        manifest.version = pkg.version;
        manifest.description = pkg.description;
        manifest.name = manifest.name || pkg.name;
        manifest.homepage_url = manifest.homepage_url || `https://github.com/${pkg.name}`;

        fs.writeFileSync('./manifest.json', JSON.stringify(manifest, null, 2) + '\n');
        console.log('✅ manifest.json updated.');
    }
} catch (error) {
    console.error('❌ Failed to sync version info:', error);
    process.exit(1);
}

// 4. Generate the local SVG version badge.
try {
    const format = {
        label: 'version',
        message: `v${pkg.version}`,
        color: '#ff6b00', // Your custom GitHub Orange
        style: 'flat'
    };
    const svg = makeBadge(format);
    fs.writeFileSync('./icons/version-badge.svg', svg);
    console.log('🎨 Local version badge generated.');
} catch (error) {
    console.error('❌ Failed to generate badge:', error);
    process.exit(1);
}

// 5. When requested, stage the worktree and create a versioned commit.
if (process.argv.includes('--commit')) {
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    const changeset = (await prompt.question('Brief changeset: ')).trim();
    prompt.close();

    if (!changeset) {
        console.error('❌ A brief changeset is required; no commit was created.');
        process.exit(1);
    }

    const commitMessage = `v${pkg.version}: ${changeset}`;
    execFileSync('git', ['add', '-A'], { stdio: 'inherit' });
    execFileSync('git', ['commit', '-m', commitMessage], { stdio: 'inherit' });
    console.log(`✅ Committed: ${commitMessage}`);
}
