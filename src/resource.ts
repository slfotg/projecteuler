import * as vscode from "vscode";

/**
 * Provides access to text files associated with a problem in a new editor
 */
export class EulerResourceProvider implements vscode.TextDocumentContentProvider {
    private globalStorageUri: vscode.Uri;

    constructor(context: vscode.ExtensionContext) {
        this.globalStorageUri = context.globalStorageUri;
    }

    provideTextDocumentContent(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<string> {
        const resource = uri.query.split("=")[1];
        const resourceUri = vscode.Uri.joinPath(this.globalStorageUri, resource);
        return new Promise(resolve => {
            vscode.workspace.fs.readFile(resourceUri).then((buffer) => {
                resolve(`${buffer}`);
            });
        });
    }
}