jest.mock('child_process', () => ({
    spawn: jest.fn(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
    }))
}));

jest.mock('wait-on', () => jest.fn(() => Promise.resolve()));

describe('Streaming response tests', () => {
    let serverlesswp;

    beforeEach(() => {
        jest.resetModules();
        jest.restoreAllMocks();
        serverlesswp = require('../src/index');
    });

    function mockFetch(body, init = {}) {
        return jest.spyOn(global, 'fetch').mockResolvedValue(
            new Response(body, {
                status: init.status || 200,
                headers: new Headers(init.headers || {})
            })
        );
    }

    test('returns a Web Response when streaming is true', async () => {
        mockFetch('hello', { headers: { 'content-type': 'text/html' } });

        const result = await serverlesswp({
            event: { path: '/test', headers: {} },
            docRoot: '/',
            streaming: true
        });

        expect(result).toBeInstanceOf(Response);
        expect(result.status).toBe(200);
        expect(await result.text()).toBe('hello');
    });

    test('returns plain object when streaming is not set', async () => {
        mockFetch('hello', { headers: { 'content-type': 'text/html' } });

        const result = await serverlesswp({
            event: { path: '/test', headers: {} },
            docRoot: '/'
        });

        expect(result).not.toBeInstanceOf(Response);
        expect(result.statusCode).toBe(200);
        expect(result.body).toBe('hello');
    });

    test('streaming response includes cookies as set-cookie headers', async () => {
        const headers = new Headers();
        headers.append('content-type', 'text/html');
        headers.append('set-cookie', 'cookie1=test; path=/');
        headers.append('set-cookie', 'cookie2=test; path=/');

        jest.spyOn(global, 'fetch').mockResolvedValue(
            new Response('hello', { status: 200, headers })
        );

        const result = await serverlesswp({
            event: { path: '/test', headers: {} },
            docRoot: '/',
            streaming: true
        });

        const cookies = result.headers.getSetCookie();
        expect(cookies).toHaveLength(2);
        expect(cookies).toContain('cookie1=test; path=/');
        expect(cookies).toContain('cookie2=test; path=/');
    });

    test('streaming response rewrites location header', async () => {
        mockFetch('', {
            status: 301,
            headers: { 'location': 'http://127.0.0.1:8000/new-path' }
        });

        const result = await serverlesswp({
            event: { path: '/old', headers: {} },
            docRoot: '/',
            streaming: true
        });

        expect(result.headers.get('location')).toBe('/new-path');
    });

    test('streaming response sets cache-control for static files', async () => {
        mockFetch('body{}', { headers: { 'content-type': 'text/css' } });

        const result = await serverlesswp({
            event: { path: '/style.css', headers: {} },
            docRoot: '/',
            streaming: true
        });

        expect(result.headers.get('cache-control')).toBe('max-age=3600, s-maxage=86400');
    });

    test('streaming response uses custom defaultCacheControl', async () => {
        mockFetch('body{}', { headers: { 'content-type': 'text/css' } });

        const result = await serverlesswp({
            event: { path: '/style.css', headers: {} },
            docRoot: '/',
            streaming: true,
            defaultCacheControl: 'max-age=60'
        });

        expect(result.headers.get('cache-control')).toBe('max-age=60');
    });

    test('streaming preRequest plugin returns a Response', async () => {
        mockFetch('should not reach');

        serverlesswp.registerPlugin({
            name: 'streaming-pre',
            preRequest: async function(event) {
                return {
                    statusCode: 201,
                    headers: { 'x-custom': 'from-plugin' },
                    body: 'plugin body'
                };
            }
        });

        const result = await serverlesswp({
            event: { path: '/test', headers: {} },
            docRoot: '/',
            streaming: true
        });

        expect(result).toBeInstanceOf(Response);
        expect(result.status).toBe(201);
        expect(result.headers.get('x-custom')).toBe('from-plugin');
        expect(await result.text()).toBe('plugin body');
    });

    test('streaming error fallback returns a Response', async () => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(global, 'fetch').mockRejectedValue(new Error('connection failed'));

        const result = await serverlesswp({
            event: { path: '/test', headers: {} },
            docRoot: '/',
            streaming: true
        });

        expect(result).toBeInstanceOf(Response);
        expect(result.status).toBe(500);
    });

    test('streaming postRequest plugin can modify headers', async () => {
        mockFetch('hello', { headers: { 'content-type': 'text/html' } });

        serverlesswp.registerPlugin({
            name: 'streaming-post-headers',
            postRequest: async function(event, response) {
                response.headers['x-added'] = 'yes';
                return response;
            }
        });

        const result = await serverlesswp({
            event: { path: '/test', headers: {} },
            docRoot: '/',
            streaming: true
        });

        expect(result).toBeInstanceOf(Response);
        expect(result.headers.get('x-added')).toBe('yes');
    });

    test('streaming postRequest plugin retry fetches again', async () => {
        let fetchCount = 0;
        jest.spyOn(global, 'fetch').mockImplementation(() => {
            fetchCount++;
            return Promise.resolve(new Response(`call ${fetchCount}`, {
                status: 200,
                headers: { 'content-type': 'text/html' }
            }));
        });

        let pluginCallCount = 0;
        serverlesswp.registerPlugin({
            name: 'streaming-retry',
            postRequest: async function(event, response) {
                pluginCallCount++;
                if (pluginCallCount === 1) {
                    return { ...response, retry: true };
                }
                return response;
            }
        });

        const result = await serverlesswp({
            event: { path: '/test', headers: {} },
            docRoot: '/',
            streaming: true
        });

        expect(fetchCount).toBe(2);
        expect(await result.text()).toBe('call 2');
    });

    test('streaming preserves status code', async () => {
        mockFetch('not found', { status: 404, headers: { 'content-type': 'text/html' } });

        const result = await serverlesswp({
            event: { path: '/missing', headers: {} },
            docRoot: '/',
            streaming: true
        });

        expect(result).toBeInstanceOf(Response);
        expect(result.status).toBe(404);
    });
});
