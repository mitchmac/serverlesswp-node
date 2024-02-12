let plugins = [];

function register(plugin) {
    //@TODO: validate the plugin
    plugins.push(plugin);
}

function getPlugins() {
    return plugins;
}

async function executePreRequest(event) {
    let response = null;
    //@TODO: only loop through plugins with preRequest.
    for (let i = 0; i < plugins.length; i++) {
        let plugin = plugins[i];
        if (plugin.preRequest) {
            response = await plugin.preRequest(event, response);
        }
    }

    return response;
}

async function executePostRequest(event, response) {
    //@TODO: only loop through plugins with postRequest.
    for (let i = 0; i < plugins.length; i++) {
        let plugin = plugins[i];
        if (plugin.postRequest) {
            response = await plugin.postRequest(event, response);
        }
    }

    return response;
}

module.exports.register = register;
module.exports.getPlugins = getPlugins;
module.exports.executePreRequest = executePreRequest;
module.exports.executePostRequest = executePostRequest;