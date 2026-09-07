const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const php = require('../index.js');
const { setup } = require('./directory.js');
const storage = require('./storage.js');
const { validate } = require('./install.js');

const assets = path.resolve(__dirname, '../../wordpress-assets');
let options = {};
let initialization;

// The underlying PHP server and plugin registry support one site per process.
function configure(config = {}) {
    if (initialization) throw new Error('Configure WordPress before the first request.');
    for (const key of Object.keys(config)) {
        if (!['sourceDir', 'runtimeDir', 'plugins'].includes(key)) throw new Error(`Unknown WordPress option: ${key}`);
    }
    if (config.plugins && !Array.isArray(config.plugins)) throw new Error('plugins must be an array.');
    options = { ...config, plugins: [...(config.plugins || [])] };
}

async function initialize() {
    const sourceDir = path.resolve(options.sourceDir || path.join(process.cwd(), 'wp'));
    const runtimeDir = path.resolve(options.runtimeDir || path.join(os.tmpdir(), 'wp'));
    const contentDir = path.join(runtimeDir, 'wp-content');
    const database = storage.resolve();
    const routerScript = path.join(assets, 'router.php');
    const autoPrependFile = path.join(assets, 'prepend.php');
    for (const file of [routerScript, autoPrependFile,
        path.join(assets, 'plugin.php'), path.join(assets, 'serverlesswp-stream-wrapper/vendor/autoload.php')]) {
        await fs.access(file);
    }
    await setup(sourceDir, runtimeDir);
    // Server configuration only. Never derive executable paths from HTTP headers.
    process.env.SERVERLESSWP_ASSETS_DIR = assets;
    if (!process.env.SERVERLESSWP_STREAM_WP_CONTENT_DIR) {
        process.env.SERVERLESSWP_STREAM_WP_CONTENT_DIR = contentDir;
    }
    if (database.plugin) {
        await database.plugin.prepPlugin(contentDir, path.join(contentDir, 'plugins/sqlite-database-integration'));
        database.plugin.config(database.config);
    }
    const active = [];
    const readOnly = process.env.SERVERLESSWP_READ_ONLY_MODE;
    if (readOnly && !['false', '0', 'no'].includes(readOnly.toLowerCase())) active.push(require('./readOnly.js'));
    if (database.plugin) active.push(database.plugin);
    if (process.env.SERVERLESSWP_DATA_SECRET) active.push(require('./sandbox.js'));
    active.push(...(options.plugins || []));
    // Validate all names before mutating the shared registry.
    const names = new Set(php.getPlugins().map(plugin => plugin.name));
    for (const plugin of active) {
        if (!plugin || !Object.hasOwn(plugin, 'name') || !plugin.name || names.has(plugin.name)) {
            throw new Error('WordPress plugins must have unique, non-empty names.');
        }
        names.add(plugin.name);
    }
    for (const plugin of active) php.registerPlugin(plugin);
    return { docRoot: runtimeDir, routerScript, autoPrependFile };
}

async function handler(event, context, callback) {
    // Retain rejected initialization too: a fresh process is required after failure.
    // Retrying here could reuse partially prepared files or registered plugins.
    initialization ||= initialize();
    const runtime = await initialization;
    const response = await php({ ...runtime, event });
    return validate(response) || response;
}

module.exports = { handler, configure, assets };
