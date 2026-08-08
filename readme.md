# ServerlessWP
Serverless PHP on AWS Lambda, Vercel or Netlify

Just want to get started with WordPress?

Try the [WordPress starter project](https://github.com/mitchmac/serverlesswp)!

| Netlify | Vercel |
| --- | --- |
| [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/mitchmac/serverlesswp) |[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmitchmac%2Fserverlesswp) |


## Overview

This is the library that powers ServerlessWP but it can also be used standalone to execute PHP in Lambda functions.

ServerlessWP includes PHP 8.1 with common extensions and libraries required by WordPress to run in the serverless function Node.js runtimes of Vercel and Netlify.

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
