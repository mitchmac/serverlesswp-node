const fs = require('node:fs/promises');
const path = require('node:path');

module.exports = async function prepareSqliteDropIn(contentDir, pluginDir) {
    const template = await fs.readFile(path.join(pluginDir, 'db.copy'), 'utf8');
    const content = template
        .replaceAll('{SQLITE_IMPLEMENTATION_FOLDER_PATH}', pluginDir)
        .replaceAll('{SQLITE_PLUGIN}', 'sqlite-database-integration/load.php');
    const destination = path.join(contentDir, 'db.php');
    try {
        await fs.writeFile(destination, content, { flag: 'wx' });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        if (await fs.readFile(destination, 'utf8') !== content) {
            throw new Error('SQLite persistence requires its database drop-in, but wp-content/db.php is site-owned. Remove it explicitly or choose a compatible database configuration.');
        }
    }
};
