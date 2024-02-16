let plugins = [];

function register(plugin) {
    // Require a plugin name.
    if (!plugin.hasOwnProperty("name") || !plugin.name) {
        throw new Error("Plugins are required to have a name");
    }

    // Don't allow double registration.
    if (plugins.find((plug) => plug.name === plugin.name)) {
        throw new Error("Plugins can only be registered once");
    }

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

    //@TODO: validate response
    return response;
}

async function executePostRequest(event, response) {
    //@TODO: only loop through plugins with postRequest.
    for (let i = 0; i < plugins.length; i++) {
        let plugin = plugins[i];
        let pluginResponse;

        if (plugin.postRequest) {
            pluginResponse = await plugin.postRequest(event, response);
            if (pluginResponse) {
                response = pluginResponse;
            }
        }
    }

    //@TODO: validate response
    return response;
}

module.exports.register = register;
module.exports.getPlugins = getPlugins;
module.exports.executePreRequest = executePreRequest;
module.exports.executePostRequest = executePostRequest;