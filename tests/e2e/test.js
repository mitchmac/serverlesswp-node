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
  
    const response = await serverlesswp({event: event, docRoot: docRoot, routerScript: routerScript});
   
    return response;
};