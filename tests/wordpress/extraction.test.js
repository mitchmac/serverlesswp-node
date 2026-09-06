const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { setup } = require('../../src/wordpress/directory');
const prepareDropIn = require('../../src/wordpress/sqliteDropIn');
const packageRoot = path.resolve(__dirname, '../..');

async function fixture(t) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'serverlesswp-extraction-'));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    // Minimal test inputs, not distributable starter templates.
    const mu = path.join(root, 'wp/wp-content/mu-plugins');
    await fs.mkdir(mu, { recursive: true });
    for (const [name, asset] of [
        ['serverlesswp.php', 'plugin.php'],
        ['serverlesswp-stream-wrapper.php', 'serverlesswp-stream-wrapper/serverlesswp-stream-wrapper.php'],
    ]) {
        await fs.writeFile(path.join(mu, name), `<?php require_once getenv('SERVERLESSWP_ASSETS_DIR') . '/${asset}';`);
    }
    await fs.writeFile(path.join(root, 'vercel.json'), JSON.stringify({
        functions: { 'api/vercel.js': { includeFiles: 'node_modules/serverlesswp/**' } },
    }));
    // A completely site-owned config, with no framework import or required marker.
    await fs.writeFile(path.join(root, 'wp/wp-config.php'), "<?php define('WP_HOME', 'https://custom.test'); define('DISALLOW_FILE_MODS', false);");
    await fs.writeFile(path.join(mu, 'aaa-custom.php'), '<?php $GLOBALS["custom_mu"][] = "before";');
    await fs.writeFile(path.join(mu, 'zzz-custom.php'), '<?php $GLOBALS["custom_mu"][] = "after";');
    await fs.mkdir(path.join(root, 'wp/wp-content/plugins/custom'), { recursive: true });
    await fs.writeFile(path.join(root, 'wp/wp-content/plugins/custom/style.css'), '/* custom */');
    await fs.writeFile(path.join(root, 'wp/.site-file'), 'visible site-owned file');
    return root;
}
async function snapshot(root, relative = '') {
    const result = {};
    for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
        const name = path.join(relative, entry.name);
        if (entry.isDirectory()) Object.assign(result, await snapshot(root, name));
        else result[name] = await fs.readFile(path.join(root, name), 'base64');
    }
    return result;
}

test('runtime copying preserves all site-owned WordPress files', async t => {
    const root = await fixture(t);
    const before = await snapshot(path.join(root, 'wp'));
    await setup(path.join(root, 'wp'), path.join(root, 'runtime'));
    assert.deepEqual(await snapshot(path.join(root, 'runtime')), before);
    assert.deepEqual(await snapshot(path.join(root, 'wp')), before);
});

test('SQLite preparation is repeatable and refuses custom drop-ins', async t => {
    const root = await fixture(t);
    const plugin = path.join(root, 'sqlite');
    await fs.mkdir(plugin);
    await fs.writeFile(path.join(plugin, 'db.copy'), '<?php /* {SQLITE_IMPLEMENTATION_FOLDER_PATH} {SQLITE_PLUGIN} */');
    const content = path.join(root, 'wp/wp-content');
    await fs.writeFile(path.join(content, 'db.php'), '<?php // my own database');
    await assert.rejects(prepareDropIn(content, plugin), /site-owned/);
    assert.equal(await fs.readFile(path.join(content, 'db.php'), 'utf8'), '<?php // my own database');
    await fs.unlink(path.join(content, 'db.php'));
    await prepareDropIn(content, plugin);
    await prepareDropIn(content, plugin);
    assert.match(await fs.readFile(path.join(content, 'db.php'), 'utf8'), /sqlite-database-integration\/load.php/);
});

test('custom MU plugins load around package loaders without changing site configuration', async t => {
    const root = await fixture(t);
    const phpFiles = path.join(packageRoot, 'php-files');
    const script = `
        define('ABSPATH', ${JSON.stringify(path.join(root, 'wp/'))});
        require ABSPATH . 'wp-config.php';
        function add_filter(...$args) {}
        function add_action(...$args) {}
        foreach (glob(ABSPATH . 'wp-content/mu-plugins/*.php') as $file) require $file;
        echo json_encode([$GLOBALS['custom_mu'], WP_HOME, DISALLOW_FILE_MODS, function_exists('serverlesswp_plugin_install_notice')]);
    `;
    const result = execFileSync(path.join(phpFiles, 'php'), ['-n', '-r', script], {
        cwd: phpFiles,
        env: { ...process.env, LD_LIBRARY_PATH: path.join(phpFiles, 'lib'),
            SERVERLESSWP_ASSETS_DIR: path.join(packageRoot, 'wordpress-assets'), SERVERLESSWP_STREAM_PROVIDER: '' },
    });
    assert.deepEqual(JSON.parse(result), [['before', 'after'], 'https://custom.test', false, true]);
});

test('updater resolves the consumer WordPress root', () => {
    assert.equal(require('../../src/wp-update').parseArgs([]).root, path.join(process.cwd(), 'wp'));
});

test('concurrent first requests initialize once and configure closes after startup', async t => {
    const root = await fixture(t);
    const phpPath = require.resolve('../../src/index');
    const wpPath = require.resolve('../../src/wordpress');
    const original = require(phpPath);
    const saved = { ...process.env };
    t.after(() => {
        require.cache[phpPath].exports = original;
        delete require.cache[wpPath];
        for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
        Object.assign(process.env, saved);
    });
    for (const key of ['DATABASE', 'USERNAME', 'PASSWORD', 'HOST']) process.env[key] = 'test';
    const plugins = [];
    const calls = [];
    const mock = async options => { calls.push(options); return { statusCode: 200, body: 'ok' }; };
    mock.getPlugins = () => plugins;
    mock.registerPlugin = plugin => plugins.push(plugin);
    require.cache[phpPath].exports = mock;
    delete require.cache[wpPath];
    const wordpress = require(wpPath);
    wordpress.configure({ sourceDir: path.join(root, 'wp'), runtimeDir: path.join(root, 'runtime'), plugins: [{ name: 'custom' }] });
    const responses = await Promise.all(Array.from({ length: 8 }, () => wordpress.handler({ path: '/' })));
    assert.equal(responses.length, 8);
    assert.equal(plugins.filter(p => p.name === 'custom').length, 1);
    assert.equal(calls.length, 8);
    assert.equal(calls[0].routerScript, path.join(packageRoot, 'wordpress-assets/router.php'));
    assert.equal(process.env.SERVERLESSWP_ASSETS_DIR, path.join(packageRoot, 'wordpress-assets'));
    assert.throws(() => wordpress.configure({}), /before the first request/);
});

test('failed initialization is retained without copying or registering twice', async t => {
    const root = await fixture(t);
    const wpPath = require.resolve('../../src/wordpress');
    delete require.cache[wpPath];
    t.after(() => { delete require.cache[wpPath]; });
    const wordpress = require(wpPath);
    wordpress.configure({ sourceDir: path.join(root, 'missing'), runtimeDir: path.join(root, 'runtime') });
    const first = await wordpress.handler({ path: '/' }).catch(error => error);
    await fs.cp(path.join(root, 'wp'), path.join(root, 'missing'), { recursive: true });
    const second = await wordpress.handler({ path: '/' }).catch(error => error);
    assert.equal(first, second);
    await assert.rejects(fs.access(path.join(root, 'runtime')));
});
