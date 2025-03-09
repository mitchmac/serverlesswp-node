const serverlesswp = require('./src/index');
const path = require('path');

serverlesswp.registerPlugin({
    name: 'postRequest',
    postRequest: async function(event, pluginResponse) {
        // Bypass this plugin conditionally
        if (event.hasOwnProperty("postRequestPlugin")) {
            return {
                statusCode: pluginResponse.statusCode + 1,
                body: 'Foo'
            }
        }
    }
});

serverlesswp.registerPlugin({
    name: 'preRequest',
    preRequest: async function(event) {
        // Bypass this plugin conditionally
        if (event.hasOwnProperty("preRequestPlugin")) {
            return {
                statusCode: 200,
                body: 'Foo'
            }
        }
    }
});

exports.handler = async function (event, context, callback) {
    const docRoot = path.join(process.cwd(), 'wp');
    const routerScript = path.join(process.cwd(), 'router.php');
  
    if (process.env['HOST']) {
        if (process.env['HOST'] === 'Vercel') {
            process.env['VERCEL'] = 1;
        }

        if (process.env['HOST'] === 'Netlify') {
            process.env['SITE_NAME'] = 1;
        }
    }
    const response = await serverlesswp({event: event, docRoot: docRoot, routerScript: routerScript});
   
    return response;
};