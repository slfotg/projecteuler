/* eslint-disable no-undef */
(function () {
    const vscode = acquireVsCodeApi();
    const regex = /^problem=(\d+)$/;
    const links = document.getElementsByTagName("a");

    for (let i = 0; i < links.length; i += 1) {
        if (!links[i].getAttribute("href")) {
            continue;
        }
        let matches;
        if ((matches = regex.exec(links[i].getAttribute("href"))) !== null) {
            links[i].addEventListener("click", function (e) {
                e.preventDefault();
                vscode.postMessage(matches[1]);
            });
        }
    }
})();
