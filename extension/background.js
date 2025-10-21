browser.browserAction
    .setPopupStyles({
        minWidth: 0,
        minHeight: 0,
        backgroundColor: "transparent"
    });
browser.browserAction.resizePopup(400, 420);
browser.browserAction.setPopupPosition({ bottom: "50px", right: "50px" });
browser.browserAction.detachPopup();
browser.browserAction.openPopup();