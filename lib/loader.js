// lib/loader.js  ─  Dynamic plugin loader

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = path.join(__dirname, '..', 'plugins');

/**
 * Loads all .js files in the plugins folder.
 * Each plugin exports: { name, description, ownerOnly?, run(ctx) }
 * Returns a Map<command, plugin>
 */
export async function loadPlugins() {
  const map   = new Map();
  const files = fs.readdirSync(PLUGIN_DIR).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const filePath = path.join(PLUGIN_DIR, file);
    try {
      const mod = await import(`file://${filePath}`);
      const plugins = Array.isArray(mod.default) ? mod.default : [mod.default];

      for (const plugin of plugins) {
        if (!plugin?.name || typeof plugin.run !== 'function') continue;
        const names = Array.isArray(plugin.name) ? plugin.name : [plugin.name];
        for (const n of names) {
          map.set(n.toLowerCase(), plugin);
        }
      }
    } catch (err) {
      console.warn(chalk.yellow(`  ⚠ Failed to load plugin [${file}]: ${err.message}`));
    }
  }

  return map;
}
