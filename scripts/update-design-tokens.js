#!/usr/bin/env node

/**
 * Script to update color tokens across the codebase
 * from old slate/blue/green to new rust/gold/cream palette
 */

const fs = require('fs');
const path = require('path');

// Color mappings from old to new
const COLOR_MAPPINGS = {
  // Background colors
  'bg-slate-50': 'bg-cream-100',
  'bg-slate-100': 'bg-cream-200',
  'bg-slate-200': 'bg-cream-200',

  // Text colors
  'text-slate-900': 'text-dark-900',
  'text-slate-800': 'text-dark-900',
  'text-slate-700': 'text-dark-600',
  'text-slate-600': 'text-dark-600',
  'text-slate-500': 'text-dark-500',
  'text-slate-400': 'text-dark-500',

  // Border colors
  'border-slate-200': 'border-gold-600/20',
  'border-slate-300': 'border-gold-600/20',

  // Blue to Gold (for active/voting states)
  'bg-blue-50': 'bg-gold-50',
  'bg-blue-100': 'bg-gold-100',
  'bg-blue-600': 'bg-gold-600',
  'bg-blue-700': 'bg-gold-700',
  'bg-blue-800': 'bg-gold-800',
  'text-blue-600': 'text-gold-700',
  'text-blue-700': 'text-gold-700',
  'text-blue-800': 'text-dark-900',
  'text-blue-900': 'text-dark-900',
  'border-blue-200': 'border-gold-600',

  // Green to Rust (for complete/finalized states)
  'bg-green-50': 'bg-rust-50',
  'bg-green-100': 'bg-rust-100',
  'bg-green-600': 'bg-rust-600',
  'bg-green-700': 'bg-rust-700',
  'text-green-600': 'text-rust-700',
  'text-green-700': 'text-rust-700',
  'text-green-800': 'text-cream-100',
  'text-green-900': 'text-cream-100',
  'border-green-200': 'border-rust-600',

  // Typography
  'font-bold': 'font-bold font-inria',
  'font-semibold': 'font-semibold font-inria',
  'font-medium': 'font-medium font-inria',
};

// Patterns that need to stay unchanged (errors, etc.)
const PRESERVE_PATTERNS = [
  /bg-red-/,
  /text-red-/,
  /border-red-/,
  /text-white/,
  /bg-white/,
];

async function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // Apply color mappings
    for (const [oldColor, newColor] of Object.entries(COLOR_MAPPINGS)) {
      const regex = new RegExp(oldColor, 'g');
      if (content.includes(oldColor)) {
        content = content.replace(regex, newColor);
        modified = true;
      }
    }

    // If file was modified, write it back
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Updated: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`✗ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.tsx')) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

async function main() {
  console.log('🎨 Updating design tokens across codebase...\n');

  // Find all TSX files in components and app directories
  const componentsFiles = getAllFiles(path.join(process.cwd(), 'components'));
  const appFiles = getAllFiles(path.join(process.cwd(), 'app'));
  const files = [...componentsFiles, ...appFiles];

  console.log(`Found ${files.length} component files\n`);

  let updatedCount = 0;
  for (const file of files) {
    const wasUpdated = await updateFile(file);
    if (wasUpdated) updatedCount++;
  }

  console.log(`\n✨ Updated ${updatedCount} files`);
  console.log(`📝 ${files.length - updatedCount} files unchanged`);
}

main().catch(console.error);
