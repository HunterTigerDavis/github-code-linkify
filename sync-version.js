import fs from 'fs';
import { makeBadge } from 'badge-maker';

// 1. Read the single source of truth from package.json
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
console.log(`⏳ Syncing configuration files for v${pkg.version}...`);

// 2. Directly mirror version and description to manifest.json
if (fs.existsSync('./manifest.json')) {
    const manifest = JSON.parse(fs.readFileSync('./manifest.json', 'utf8'));
    manifest.version = pkg.version;
    manifest.description = pkg.description;
    fs.writeFileSync('./manifest.json', JSON.stringify(manifest, null, 2) + '\n');
    console.log('✅ manifest.json updated.');
}

// 3. Generate the local SVG version badge
try {
    const svg = makeBadge({
        label: 'version',
        message: `v${pkg.version}`,
        color: 'ff6b00', // Your custom GitHub Orange
        style: 'flat'
    });
    fs.writeFileSync('./version-badge.svg', svg);
    console.log('🎨 Local version badge generated.');
} catch (error) {
    console.error('❌ Failed to generate badge:', error);
}