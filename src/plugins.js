let plugins = [];
let hooks = ["preRequest", "postRequest"];
let hookTracker = {};

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

    // Register each hook implementation.
    for (const hook of hooks) {
        if (typeof plugin[hook] === 'function') {
            if (!hookTracker[hook]) {
                hookTracker[hook] = [];
            }
            hookTracker[hook].push(plugin.name);
        }
    }
}

function getPlugins() {
    return plugins;
}

function getPluginByName(name) {
    return plugins.find(plugin => plugin.name === name);
}

async function executePreRequest(event) {
    let response = null;
    if (hookTracker["preRequest"]) {
        for (const pluginName of hookTracker["preRequest"]) {
            let plugin = getPluginByName(pluginName);
            response = await plugin.preRequest(event, response);
        }
    }
    
    //@TODO: validate response
    return response;
}

async function executePostRequest(event, response) {
    if (hookTracker["postRequest"]) {
        for (const pluginName of hookTracker["postRequest"]) {
            let plugin = getPluginByName(pluginName);
            let pluginResponse;

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