const plugins = require('../src/plugins');

test('Plugin registration', () => {
    plugins.register({name: 'foo'});
    plugins.register({name: 'bar'});
  
    const pluginList = plugins.getPlugins();
    expect(pluginList).toHaveLength(2);
});

test('Plugins need a name', () => {
    expect(() => { plugins.register({}) }).toThrow();
    expect(() => { plugins.register({name: ''}) }).toThrow();
});

test('Plugins can only be registered once', () => {
    plugins.register({name: 'baz'});
    expect(() => { plugins.register({name: 'baz'}) }).toThrow();
});

test('Do not execute non-existent preRequest', async () => {
    plugins.register({name: 'Test'});

    const response = await plugins.executePreRequest({test: 'test'});
    expect(response).toBeNull();
});

test('Execute preRequest', async () => {
    const statusCode = 200;
    const body = 'foo';

    plugins.register({
        name: 'preRequest',
        preRequest: async function(event, response) {
            return {
                statusCode: 200,
                body: event.test,
            }
        },
    });

    const response = await plugins.executePreRequest({test: body});
    expect(response.body).toEqual(body);
    expect(response.statusCode).toEqual(statusCode);
});

test('Execute multiple preRequest', async () => {
    const body = 'foo';

    plugins.register({
        name: '1',
        preRequest: async function(event, response) {
            return {
                statusCode: 200,
                body: event.test,
            }
        },
    });

    plugins.register({
        name: '2',
        preRequest: async function(event, response) {
            if (response?.statusCode) {
                response.statusCode = response.statusCode + 1;
            }
            return response;
        },
    });

    const response = await plugins.executePreRequest({test: body});
    expect(response.body).toEqual(body);
    expect(response.statusCode).toEqual(201);
});

test('Execute postRequest', async () => {
    plugins.register({
        name: 'postRequest',
        postRequest: async function(event, response) {
            return {
                statusCode: response.statusCode + 1,
                body: 'Foo'
            }
        }
    });

    const response = await plugins.executePostRequest({test: 'foo'}, {statusCode: 200, body: 'Test'});
    expect(response.body).toEqual('Foo');
    expect(response.statusCode).toEqual(201);
});