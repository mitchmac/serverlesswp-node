const serverlesswp = require('./src/index');
const path = require('path');

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