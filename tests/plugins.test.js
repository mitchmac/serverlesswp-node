const plugins = require('../src/plugins');

test('Plugin registration', () => {
    plugins.register({name: 'foo'});
    plugins.register({name: 'bar'});
  
    const pluginList = plugins.getPlugins();
    expect(pluginList).toHaveLength(2);
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
        name: 'Hello World',
        preRequest: async function(event) {
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