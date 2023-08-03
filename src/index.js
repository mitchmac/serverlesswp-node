const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const { URL } = require('node:url');

const waitOn = require('wait-on');
const fetch = require('node-fetch');
const isBinaryFile = require("isbinaryfile").isBinaryFile;

let php;
let serverReady = false;

const libPath = path.resolve(__dirname, '../php-files/lib');
const phpPath = path.resolve(__dirname, '../php-files/php');
const phpIniPath = path.resolve(__dirname, '../php-files/php.ini');
const cwd = path.resolve(__dirname, '../php-files');

async function handler(data) {
    await validate(data);

    const { event, docRoot } = data;
    
    if (!php) {
        const env = {
            ...process.env,
            LD_LIBRARY_PATH: `${libPath}:${process.env['LD_LIBRARY_PATH']}`,
            LD_PRELOAD: `${libPath}/libsqlite3.so.0`
        };

        //@TODO: configurable php.ini path
        let phpArgs = ['-S', '127.0.0.1:8000', '-t', docRoot, '-c', phpIniPath];

        if (data.routerScript) {
            phpArgs.push(data.routerScript);
        }

        php = spawn(phpPath, phpArgs, {
            env: env,
            cwd: cwd
        });

        php.stdout.on('data', data => {
            console.log(data.toString());
        });
    
        php.on('error', function (err) {
            console.log(err);
        });

        php.stderr.on('data', data => {
            console.log(data.toString());
        });
    }

    try {
        if (!serverReady) {
            const waitOnOpts = {
                resources: [
                    'tcp:127.0.0.1:8000'
                ],
                interval: 5, // poll interval in ms
                timeout: 9000, // timeout in ms
            };
            await waitOn(waitOnOpts);
            serverReady = true;
        }

        // Netlify: event.rawQuery
        // Vercel: query string is included with event.path
        let queryString = '';
        if (event.rawQuery) {
            queryString = `?${event.rawQuery}`;
        }

        // AWS
        if (event.rawQueryString) {
            queryString = `?${event.rawQueryString}`;
        }

        let body = '';
        if (event.body) {
            if (event.isBase64Encoded) {
              body = Buffer.from(event.body, 'base64');
            }
            else {
              body = event.body;
            }
        }

        let urlPath = '';
        // Vercel & Netlify.
        if (event.path) {
            urlPath = event.path;
        }

        // AWS.
        if (event.rawPath && !urlPath) {
            urlPath = event.rawPath;
        }


        let requestHeaders;
        if (event.cookies) {
            let cookielist = '';
            for (var i = 0; i < event.cookies.length; i++) {
                cookielist += event.cookies[i] + '; ';
            }
            cookielist = cookielist.slice(0, -2);
            requestHeaders = { ...event.headers, Cookie: cookielist };
        }
        else {
            requestHeaders = event.headers;
        }

        let requestMethod = 'GET';

        // Vercel & Netlify.
        if (event.httpMethod) {
            requestMethod = event.httpMethod
        }

        // AWS
        if (event.requestContext?.http?.method) {
            requestMethod = event.requestContext.http.method;
        }

        const url = `http://127.0.0.1:8000${urlPath}${queryString}`;
        
        let fetchOpts = {
          method: requestMethod,
          headers: requestHeaders,
          redirect: 'manual',
          compress: false
        };

        if (body) {
            fetchOpts.body = body;
        }

        const response = await fetch(url, fetchOpts);

        let headers = {};
        for (const [key, value] of Object.entries(response.headers.raw())) {
          if (key !== 'set-cookie') {
            headers[key] = value[0];
          }
        }

        let multiHeaders = {};
        if (response.headers.raw()['set-cookie']) {
            if (process.env['VERCEL']) {
                headers['set-cookie'] = response.headers.raw()['set-cookie'];
            }
            else {
                multiHeaders['set-cookie'] = response.headers.raw()['set-cookie'];
            }
          }
        
        const responseBuffer = await response.arrayBuffer();

        let base64Encoded = false;
        let responseBody;

        const isBin = await isBinaryFile(responseBuffer);
        if (isBin) {
          responseBody = Buffer.from(responseBuffer).toString('base64');
          base64Encoded = true;
        }
        else {
          responseBody = Buffer.from(responseBuffer).toString('utf8');
        }

        if (headers['location']) {
          if (headers['location'].indexOf('http://127.0.0.1:8000') !== -1) {
            headers['location'] = headers['location'].replace('http://127.0.0.1:8000', '');
          }
        }


        if (!headers['cache-control'] && response.status === 200 && (!data.hasOwnProperty('skipCacheControl') || (data.hasOwnProperty('skipCacheControl') && !data.skipCacheControl))) {
            let cacheControl = 'max-age=3600, s-maxage=86400';

            if (data.defaultCacheControl) {
                cacheControl = data.defaultCacheControl;
            }
            
            if (shouldCacheControl(url)) {
                headers['cache-control'] = cacheControl;
            }
        }

        let returnResponse = {
          statusCode: response.status || 200,
          headers: headers,
          body: responseBody,
          isBase64Encoded: base64Encoded
        };

        // AWS
        if (!process.env['VERCEL'] && !process.env['SITE_NAME']) {
            if (multiHeaders['set-cookie']) {
                returnResponse.cookies = multiHeaders['set-cookie'];
                delete multiHeaders['set-cookie'];
            }
        }

        if (multiHeaders['set-cookie']) {
            returnResponse.multiValueHeaders = multiHeaders;
        }

        return returnResponse;
    }
    catch (err) {
        console.log(err);
    }

    return {
        statusCode: 500,
        body: 'There was a problem, check your function logs for clues.'
    }
}

//@TODO: tests
function shouldCacheControl(url) {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname.match(/\.(js|css|svg|png|gif|txt|jpg|jpeg|webp|woff|woff2|ico|otf)$/gi)) {
        return true;
    }
    return false;
}

async function validate(data) {
    if (!data.hasOwnProperty("event")) {
        throw new Error("The event property is required.");
    }
    else if (!data.event) {
        throw new Error("The event property cannot be empty.");
    }


    if (!data.hasOwnProperty("docRoot")) {
        throw new Error("The docRoot or routerScript property is required.");
    }

    const docRootExists = await exists(data.docRoot);
    if (!docRootExists) {
        throw new Error("The docRoot property is not a valid path.");
    }

    if (data.hasOwnProperty("routerScript")) {
        const routerExists = await exists(data.routerScript);
        if (!routerExists) {
            throw new Error("The routerScript property is not a valid path.");
        }
    }
}

async function exists(path) {
    try {
      await fs.access(path);
      return true;
    } catch (error) {
      return false;
    }
}

module.exports = handler;
module.exports.validate = validate;