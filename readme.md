# ServerlessWP
Serverless PHP on AWS Lambda, Vercel or Netlify

Just want to get started with WordPress?

Try the [WordPress starter project](https://github.com/mitchmac/serverlesswp)!

## Overview

This is the library that powers ServerlessWP but it can also be used standalone to execute PHP in Lambda functions.

ServerlessWP includes PHP 8.3 with common extensions and libraries required by WordPress to run in the serverless function Node.js runtimes of Vercel and Netlify.

## Usage
```
npm i serverlesswp
```

Then in your project's function directory use the ServerlessWP library in a file like api/index.js:

```javascript
const path = require('path');
const serverlesswp = require('serverlesswp');

exports.handler = async function (event, context, callback) {
    const pathToWP = path.join(process.cwd(), 'wp');

    return await serverlesswp({docRoot: pathToWP, event: event});
}
```

Where

* docRoot is the path to WordPress files
* event is the serverless event data from Vercel or Netlify

### Options

| Option | Description |
| --- | --- |
| `docRoot` | Path to the PHP files to serve. Required. |
| `event` | The serverless event data from Vercel, Netlify or AWS. Required. |
| `routerScript` | Path to a [router script](https://www.php.net/manual/en/features.commandline.webserver.php) for the built-in server. |
| `phpIniPath` | Path to a php.ini to use instead of the one shipped with this package. |
| `autoPrependFile` | Path to a PHP file to run before every request, via `auto_prepend_file`. |

`autoPrependFile` runs on every request, so point it at a path that stays
read-only at runtime (on Lambda-based platforms, the deployment bundle rather
than `/tmp`).

Caveat when combining it with `routerScript`: PHP's built-in server does not
apply `auto_prepend_file` to the router script's own execution — only to
scripts it executes directly after the router returns `false`. A router that
handles a request inline (e.g. by requiring `index.php`) must load the prepend
itself:

```php
$prepend = (string) ini_get('auto_prepend_file');
if ($prepend !== '' && is_file($prepend)) {
    require_once $prepend;
}
```

```javascript
return await serverlesswp({
    docRoot: pathToWP,
    event: event,
    autoPrependFile: path.join(process.cwd(), 'wp/wp-content/plugins/my-plugin/bootstrap/prepend.php')
});
```

## License
MIT

## WordPress starter runtime

```js
exports.handler = require('serverlesswp/wordpress').handler;
```

Use the starter's two visible ServerlessWP MU-plugin loaders. Their
implementations live in `wordpress-assets/` inside this package. `wp-config.php`
stays entirely in the site: the package provides no shared configuration, does
not inspect its contents, and does not change it during installation or builds.
The handler supplies the absolute `SERVERLESSWP_ASSETS_DIR` environment variable
to PHP. The router and prepend execute from the read-only bundle.
WordPress is copied to `/tmp/wp` on first use, including custom files and MU
plugins; SQLite prepares its database drop-in only in that temporary copy and
refuses to overwrite a custom one. SQLite integration itself stays in the site.

Configuration is optional and must run before the first request:

```js
const wordpress = require('serverlesswp/wordpress');
wordpress.configure({
  sourceDir: require('path').join(process.cwd(), 'wp'),
  runtimeDir: '/tmp/wp',
  plugins: [{ name: 'My hooks', async postRequest(event, response) { /* ... */ } }],
});
exports.handler = wordpress.handler;
```

There is one PHP server and plugin registry per process. Initialization is shared
by concurrent requests. Failed initialization remains failed until a new process
starts, avoiding partial retries. Custom plugins run after built-in plugins.
The generic root import does not initialize WordPress or load storage SDKs.

### WordPress updater

Run `node node_modules/serverlesswp/src/wp-update` from the site repository,
or use the starter's `npm run wp:update` script. The updater retains checksum
protections: `--plugins` updates site plugins, `--themes` reports available theme
updates, and `--dry-run` makes no changes. `--root` selects the WordPress directory.
The package has no general CLI or build step. Netlify static-file preparation
remains in the starter's `netlify.toml`.

### Maintenance ownership

This package is the source for runtime behavior, framework PHP, storage
integrations and the WordPress updater. The [WordPress starter repository](https://github.com/mitchmac/ServerlessWP)
is the source for handlers, MU-plugin loaders, deployment configuration and
workflows. Sites adopt changes to those files through Git and maintain their own
configuration and customizations. This package does not ship scaffold templates
or a scaffold migration command.

### Packaging and tests

Publish `wordpress-assets/` together with `php-files/`, including production
Composer dependencies and license notices. Build the stream wrapper with
`packages/serverlesswp-stream-wrapper/build-plugin.sh`; `--check` verifies the
published copy against the source. Site installs do not run Composer.

Run `npm test` for the generic runtime and `npm run test:wordpress` for storage,
router, updater, ownership and loader tests. Test `npm pack` in a clean starter
using its `SERVERLESSWP_LOCAL` Docker fixtures before publication. Deployments
must explicitly include PHP assets: JavaScript tracing alone is insufficient.
