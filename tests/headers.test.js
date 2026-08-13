// Request-header normalization, and its ordering relative to plugins.
//
// event.headers is normalized in place before plugins run, so preRequest
// sees the same header shape on every platform - including AWS HTTP API v2
// events, where cookies arrive in event.cookies instead of a header. PHP
// then receives the headers as they are after plugins run, on every attempt.

jest.mock('child_process', () => ({
    spawn: jest.fn(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
    })),
}));
jest.mock('wait-on', () => jest.fn(() => Promise.resolve()));

const serverlesswp = require('../src/index');
const { normalizeEventHeaders } = serverlesswp;

describe('normalizeEventHeaders', () => {
    test('merges event.cookies into a Cookie header', () => {
        const event = {
            headers: { host: 'example.com' },
            cookies: ['a=1', 'b=2'],
        };
        normalizeEventHeaders(event);
        expect(event.headers.Cookie).toBe('a=1; b=2');
    });

    test('adds injectHost so PHP can recover the host fetch drops', () => {
        const event = { headers: { host: 'example.com' } };
        normalizeEventHeaders(event);
        expect(event.headers.injectHost).toBe('example.com');
    });

    test.each(['injecthost', 'InjectHost', 'injectHost'])(
        'replaces a client-supplied %s header with the trusted host',
        (headerName) => {
            const event = {
                headers: {
                    host: 'example.com',
                    [headerName]: 'attacker.invalid',
                },
            };

            normalizeEventHeaders(event);

            const injectHostHeaders = Object.entries(event.headers)
                .filter(([name]) => name.toLowerCase() === 'injecthost');
            expect(injectHostHeaders).toEqual([['injectHost', 'example.com']]);
        },
    );

    test('removes transfer-encoding', () => {
        const event = { headers: { 'transfer-encoding': 'chunked' } };
        normalizeEventHeaders(event);
        expect(event.headers['transfer-encoding']).toBeUndefined();
    });

    test('tolerates events without headers', () => {
        const event = {};
        normalizeEventHeaders(event);
        expect(event.headers).toEqual({});
    });
});

describe('plugins and PHP see the same headers', () => {
    test('preRequest sees normalized headers; PHP sees plugin changes on each attempt', async () => {
        let attempt = 0;
        let retried = false;
        const headersSeenByPlugin = [];

        serverlesswp.registerPlugin({
            name: 'header-writer',
            preRequest: async (event) => {
                attempt++;
                headersSeenByPlugin.push({ ...event.headers });
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
        const seenByFetch = [];
        global.fetch = jest.fn(async (url, opts) => {
            seenByFetch.push({ ...opts.headers });
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

        // The plugin got the normalized view: merged Cookie and injectHost.
        expect(headersSeenByPlugin[0].Cookie).toBe('wordpress_logged_in=abc');
        expect(headersSeenByPlugin[0].injectHost).toBe('example.com');

        expect(global.fetch).toHaveBeenCalledTimes(2);

        // The plugin's value wins over the client-supplied one, and each
        // attempt carries that attempt's value.
        expect(seenByFetch[0]['x-serverlesswp-sqlite-file']).toBe('working-1.sqlite');
        expect(seenByFetch[1]['x-serverlesswp-sqlite-file']).toBe('working-2.sqlite');

        // Normalization carries through to PHP.
        expect(seenByFetch[0].Cookie).toBe('wordpress_logged_in=abc');
        expect(seenByFetch[0].injectHost).toBe('example.com');
    });
});
