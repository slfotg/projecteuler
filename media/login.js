/* eslint-disable no-undef */
(function () {
    const vscode = acquireVsCodeApi();
    const loginButton = document.getElementById("login-button");

    loginButton.addEventListener("click", (e) => {
        e.preventDefault();
        const sessionId = document.getElementById("session-id").value;
        const keepAlive = document.getElementById("keep-alive").value;
        vscode.postMessage({
            "credentials": {
                "sessionId": sessionId,
                "keepAlive": keepAlive
            }
        });
    });

})();