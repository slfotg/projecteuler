import * as vscode from "vscode";
import { LoginService } from "../service/login";
import { Command } from "../config";

export interface Credentials {
    sessionId: string,
    keepAlive: string,
}

export class LoginViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = "projecteuler.loginView";

    private _view?: vscode.WebviewView;
    private _login?: string;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _loginService: LoginService,
    ) {
        this._loginService.onLoginChanged((login) => {
            console.log(`Login: ${login}`);
            this._login = login;
            if (this._view) {
                this._view.webview.html = this._getHtml(this._view.webview);
                this._view.show();
            }
        });
    }

    private _getHtml(webview: vscode.Webview): string {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

        // Do the same for the stylesheet.
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'elements.css'));
        const loginUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'login.js'));
        const elementsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode-elements/elements/dist/bundled.js'));



        // Use a nonce to only allow a specific script to be run.
        const nonce = this.getNonce();

        if (this._login) {
            return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>Cat Colors</title>
			</head>
			<body>
				<div>Logged in as <strong>${this._login}</strong></div>
			</body>
			</html>`;
        }

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src inline 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>Cat Colors</title>
			</head>
			<body>
                <vscode-form-group variant="vertical">
                    <vscode-label for="session-id">
                        Session Id Cookie:
                    </vscode-label>
                    <vscode-textfield
                        id="session-id"
                        placeholder="__Host-PHPSESSID Cookie"
                    ></vscode-textfield>
                    <vscode-label for="keep-alive">
                        Session Id cookie:
                    </vscode-label>
                    <vscode-textfield
                        id="keep-alive"
                        placeholder="keep_alive cookie"
                    ></vscode-textfield>
                    <vscode-form-helper>
                        <p>
                        Get the <code>__Host-PHPSESSID</code> and
                        <code>keep_alive</code> cookies from the devtools in 
                        a logged in browser.
                        </p>
                    </vscode-form-helper>
                    <vscode-button type="button" id="login-button">Login</vscode-button>
                </vscode-form-group>

                <script nonce="${nonce}" src="${elementsUri}" type="module"></script>
                <script nonce="${nonce}" src="${loginUri}"></script>
			</body>
			</html>`;
    }

    resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken): Thenable<void> | void {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,

            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.onDidReceiveMessage((message) => {
            if (message["credentials"]) {
                const credentials = message["credentials"] as Credentials;
                console.log(credentials);
                vscode.commands.executeCommand(Command.Login, credentials.sessionId, credentials.keepAlive);
            }
        });
        webviewView.webview.html = this._getHtml(webviewView.webview);
    }

    private getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}