// Request-header construction, and its ordering relative to plugins.
//
// PHP must see the headers as they are after preRequest plugins run - on
// every platform and on every retry. That includes AWS HTTP API v2 events,
// where cookies arrive in event.cookies instead of event.headers.

jest.mock('child_process', () => ({
    spawn: jest.fn(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
    })),
}));
jest.mock('wait-on', () => jest.fn(() => Promise.resolve()));

const serverlesswp = require('../src/index');
const { buildRequestHeaders } = serverlesswp;

describe('buildRequestHeaders', () => {
    test('merges event.cookies into a Cookie header', () => {
        const event = {
            headers: { host: 'example.com' },
            cookies: ['a=1', 'b=2'],
        };
        const headers = buildRequestHeaders(event);
        expect(headers.Cookie).toBe('a=1; b=2');
    });

    test('adds injectHost so PHP can recover the host fetch drops', () => {
        const headers = buildRequestHeaders({ headers: { host: 'example.com' } });
        expect(headers.injectHost).toBe('example.com');
    });

    test('removes transfer-encoding', () => {
        const headers = buildRequestHeaders({ headers: { 'transfer-encoding': 'chunked' } });
        expect(headers['transfer-encoding']).toBeUndefined();
    });

    test('does not mutate the platform event object', () => {
        const event = {
            headers: { host: 'example.com', 'transfer-encoding': 'chunked' },
            cookies: ['a=1'],
        };
        buildRequestHeaders(event);
        expect(event.headers).toEqual({ host: 'example.com', 'transfer-encoding': 'chunked' });
        expect(event.headers.injectHost).toBeUndefined();
        expect(event.headers.Cookie).toBeUndefined();
    });

    test('tolerates events without headers', () => {
        expect(buildRequestHeaders({})).toEqual({});
    });
});

describe('header changes from plugins reach PHP', () => {
    test('headers are built after preRequest, on each attempt, with event.cookies present', async () => {
        let attempt = 0;
        let retried = false;

        serverlesswp.registerPlugin({
            name: 'header-writer',
            preRequest: async (event) => {
                attempt++;
                // What the sqlite plugins do: replace any inbound value with
                // a per-attempt one.
                for (const k of Object.keys(event.headers)) {
                    if (k.toLowerCase() === 'x-serverlesswp-sqlite-file') {
                        delete event.headers[k];
                    }
                }
                event.headers['x-serverlesswp-sqlite-file'] = `working-${attempt}.sqlite`;
            },
            postRequest: async () => {
                if (!retried) {
                    retried = true;
                    return { statusCode: 500, body: 'conflict', retry: true };
                }
            },
        });

        // Snapshot headers at call time - the handler reuses one fetchOpts
        // object across attempts, so inspecting it afterwards would only
        // show the last attempt's headers.
        const seenHeaders = [];
        global.fetch = jest.fn(async (url, opts) => {
            seenHeaders.push({ ...opts.headers });
            return new Response('<html>ok</html>', {
                status: 200,
                headers: { 'content-type': 'text/html' },
            });
        });

        const event = {
            path: '/index.php',
            httpMethod: 'POST',
            // AWS HTTP API v2 shape: cookies outside event.headers.
            cookies: ['wordpress_logged_in=abc'],
            headers: {
                host: 'example.com',
                'x-serverlesswp-sqlite-file': 'client-supplied.sqlite',
            },
        };

        await serverlesswp({ event, docRoot: __dirname });

        expect(global.fetch).toHaveBeenCalledTimes(2);

        // The plugin's value wins over the client-supplied one, and each
        // attempt carries that attempt's value.
        expect(seenHeaders[0]['x-serverlesswp-sqlite-file']).toBe('working-1.sqlite');
        expect(seenHeaders[1]['x-serverlesswp-sqlite-file']).toBe('working-2.sqlite');

        // The cookie merge and host workaround still apply.
        expect(seenHeaders[0].Cookie).toBe('wordpress_logged_in=abc');
        expect(seenHeaders[0].injectHost).toBe('example.com');
    });
});
