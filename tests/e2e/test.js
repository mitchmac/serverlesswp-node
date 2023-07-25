const serverlesswp = require('./src/index');
const path = require('path');

exports.handler = async function (event, context, callback) {
    const docRoot = path.join(process.cwd(), 'wp');
    const routerScript = path.join(process.cwd(), 'router.php');
  
    const response = await serverlesswp({event: event, docRoot: docRoot, routerScript: routerScript});
   
    return response;
};