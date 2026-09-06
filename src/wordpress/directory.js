const fs = require('node:fs/promises');
const path = require('node:path');

exports.setup = async function (sourceDir, runtimeDir) {
    if (sourceDir === runtimeDir || runtimeDir.startsWith(sourceDir + path.sep)) {
        throw new Error('WordPress runtimeDir must be outside the site source directory.');
    }
    await fs.access(path.join(sourceDir, 'wp-config.php'));
    await fs.mkdir(path.dirname(runtimeDir), { recursive: true });
    const staging = await fs.mkdtemp(runtimeDir + '-');
    try {
        // Includes dotfiles and user MU plugins; no generated framework overlay.
        await fs.cp(sourceDir, staging, { recursive: true, dereference: true });
        await fs.rename(staging, runtimeDir);
    } finally {
        await fs.rm(staging, { recursive: true, force: true });
    }
};
