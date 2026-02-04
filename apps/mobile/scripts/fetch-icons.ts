#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const icons: string[] = [
  'mdi:home', 'mdi:instagram', 'mdi:telegram', 'mdi:twitter', 'mdi:youtube',
  'mdi:diamond', 'mdi:diamond-outline', 'mdi:earth', 'mdi:headphones',
  'ri:telegram-fill',
  'solar:add-circle-bold', 'solar:alt-arrow-down-linear', 'solar:alt-arrow-left-linear',
  'solar:alt-arrow-right-linear', 'solar:arrow-down-linear', 'solar:arrow-left-down-linear',
  'solar:arrow-left-linear', 'solar:arrow-right-up-linear', 'solar:arrow-up-linear',
  'solar:bell-linear', 'solar:bill-list-linear', 'solar:bolt-bold', 'solar:box-linear',
  'solar:bug-linear', 'solar:camera-linear', 'solar:chart-2-linear', 'solar:chat-round-dots-linear',
  'solar:check-circle-bold', 'solar:check-square-bold', 'solar:check-square-linear',
  'solar:clock-circle-linear', 'solar:close-circle-bold', 'solar:copy-linear', 'solar:crown-bold',
  'solar:cup-star-bold', 'solar:danger-circle-bold',
  'solar:diploma-verified-bold', 'solar:document-text-linear', 'solar:dollar-bold',
  'solar:eye-closed-linear', 'solar:eye-linear', 'solar:fire-bold', 'solar:fire-linear',
  'solar:football-linear', 'solar:gallery-linear', 'solar:gamepad-linear', 'solar:gift-bold',
  'solar:gift-linear', 'solar:graph-new-up-linear', 'solar:graph-up-linear',
  'solar:home-2-bold', 'solar:home-2-linear', 'solar:key-linear',
  'solar:letter-linear', 'solar:lightbulb-linear', 'solar:link-circle-linear',
  'solar:lock-keyhole-bold', 'solar:lock-keyhole-linear', 'solar:logout-linear',
  'solar:magnifer-linear', 'solar:medal-ribbons-star-bold', 'solar:moon-linear',
  'solar:music-note-linear', 'solar:palette-linear', 'solar:pie-chart-2-linear',
  'solar:plain-2-linear', 'solar:question-circle-linear', 'solar:rocket-bold',
  'solar:scanner-linear', 'solar:settings-linear', 'solar:share-linear',
  'solar:shield-check-linear', 'solar:shield-linear', 'solar:shop-linear',
  'solar:smartphone-linear', 'solar:star-bold', 'solar:stars-bold', 'solar:sun-linear',
  'solar:target-bold', 'solar:transfer-horizontal-bold', 'solar:transfer-horizontal-linear',
  'solar:transfer-vertical-linear', 'solar:user-bold', 'solar:user-linear',
  'solar:user-plus-linear', 'solar:users-group-rounded-bold', 'solar:users-group-rounded-linear',
  'solar:wad-of-money-bold', 'solar:wad-of-money-linear', 'solar:wallet-bold',
  'solar:wallet-linear', 'solar:wallet-money-bold', 'solar:wallet-money-linear'
];

// Aliases for icons that don't exist in Solar
const aliases: Record<string, string> = {
  'solar:diamond-bold': 'mdi:diamond',
  'solar:diamond-linear': 'mdi:diamond-outline', 
  'solar:globe-linear': 'mdi:earth',
  'solar:headset-linear': 'mdi:headphones',
};

interface IconData {
  viewBox: string;
  paths: string;
}

async function fetchIcon(iconName: string): Promise<string> {
  const [prefix, name] = iconName.split(':');
  const url = `https://api.iconify.design/${prefix}/${name}.svg`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${iconName}`);
  return res.text();
}

function extractSvgContent(svg: string): { viewBox: string; inner: string } {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';
  const innerMatch = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  const inner = innerMatch ? innerMatch[1].trim() : '';
  return { viewBox, inner };
}

async function main(): Promise<void> {
  console.log('Fetching icons from Iconify...');
  
  const iconData: Record<string, IconData> = {};
  
  for (const icon of icons) {
    try {
      const svg = await fetchIcon(icon);
      const { viewBox, inner } = extractSvgContent(svg);
      iconData[icon] = { viewBox, paths: inner };
      console.log(`✓ ${icon}`);
    } catch (err) {
      console.error(`✗ ${icon}: ${(err as Error).message}`);
    }
  }
  
  // Add aliases
  for (const [alias, target] of Object.entries(aliases)) {
    if (iconData[target]) {
      iconData[alias] = iconData[target];
      console.log(`→ ${alias} (alias for ${target})`);
    }
  }
  
  const output = `// Auto-generated icon data from Iconify
// Run: npx tsx scripts/fetch-icons.ts to regenerate

export const iconData: Record<string, { viewBox: string; paths: string }> = ${JSON.stringify(iconData, null, 2)};
`;

  fs.writeFileSync(
    path.join(__dirname, '../components/icons/icon-data.ts'),
    output
  );
  
  console.log(`\n✓ Generated icon-data.ts with ${Object.keys(iconData).length} icons`);
}

main().catch(console.error);
