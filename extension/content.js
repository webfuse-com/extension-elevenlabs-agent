const CUSTOM_TOOLS = {
    getCurrentLocation() {
        return document.location.href;
    }
};


browser.runtime.onMessage
    .addListener(message => {
        let scope;
        if(message.automationScope === "custom") {
            scope = CUSTOM_TOOLS;
        } else {
            scope = message.automationScope
                ? browser.webfuseSession.automation[message.automationScope]
                : browser.webfuseSession.automation;
        }

        return scope[message.automationMethod](message.args);
    });