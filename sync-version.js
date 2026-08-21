import fs from 'fs';
import { makeBadge } from 'badge-maker';

// Sync version and description from package.json to manifest.json, and generate a local SVG badge for the extension version

// 1. Read the version number from package.json
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
console.log(`⏳ Syncing configuration files for v${pkg.version}...`);

try {
    // 2. Directly mirror package version and description to manifest.json
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

// 4. Generate the local SVG version badge using badge-maker
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
