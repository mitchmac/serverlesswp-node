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
    //@TODO: allow multiple reponses, currently last one wins.
    for (let i = 0; i < plugins.length; i++) {
        let plugin = plugins[i];
        if (plugin.preRequest) {
            response = await plugin.preRequest(event);
        }
    }

    return response;
}

async function executePostRequest() {

}

module.exports.register = register;
module.exports.getPlugins = getPlugins;
module.exports.executePreRequest = executePreRequest;