const fs = require('fs');
const path = require('path');

/**
 * Recursively collect all .js files in a directory (including subdirectories).
 * Used by both the runtime command loader and the slash command deploy script
 * so commands in subfolders (e.g. music/) are registered the same way.
 */
function getCommandFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getCommandFiles(full, files);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

module.exports = { getCommandFiles };