import * as vscode from "vscode";
import * as cheerio from "cheerio";
import { Command } from "./config";
import { ProblemData, ProblemDataService } from "./service";

export class ProblemTreeDataProvider implements vscode.TreeDataProvider<ProblemData> {
    private _onDidChangeTreeData: vscode.EventEmitter<void | ProblemData | ProblemData[] | null | undefined> = new vscode.EventEmitter<void | ProblemData | ProblemData[] | null | undefined>();
    readonly onDidChangeTreeData: vscode.Event<void | ProblemData | ProblemData[] | null | undefined> = this._onDidChangeTreeData.event;

    private problemDataService: ProblemDataService;

    constructor(problemDataService: ProblemDataService) {
        this.problemDataService = problemDataService;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProblemData): vscode.TreeItem {
        let item = new vscode.TreeItem(`Problem ${element.ID}: ${element.Title}`);
        item.resourceUri = vscode.Uri.parse(`https://projecteuler.net/problem=${element.ID}?solved=${element["Solve Status"]}`);
        item.command = {
            title: `Show Problem ${element.ID}`,
            tooltip: `Show Problem ${element.ID}`,
            command: Command.Show,
            arguments: [element.ID],
        };
        item.tooltip = `Show Problem ${element.ID}`;
        return item;
    }

    getChildren(element?: ProblemData | undefined): vscode.ProviderResult<ProblemData[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(Object.values(this.problemDataService.getProblemInfo()));
        }
    }

}

export class ProblemTreeDecorationProvider implements vscode.FileDecorationProvider {
    onDidChangeFileDecorations?: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> | undefined;
    provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FileDecoration> {
        if (uri.scheme === "https" && uri.authority === "projecteuler.net") {
            for (const param of uri.query.split("&")) {
                if (param.trim() === "solved=1") {
                    return new vscode.FileDecoration("✓", "Problem Solved", new vscode.ThemeColor("charts.green"));
                }
            };
        }
        return null;
    }
}

export class ProblemViewProvider {

    private mediaUri: vscode.Uri;
    private globalStorageUri: vscode.Uri;
    private styleMainUri: vscode.Uri;
    private scriptUri: vscode.Uri;
    private mathjaxConfig: vscode.Uri;
    private problemDataService: ProblemDataService;

    private visibleProblems: { [key: number]: vscode.WebviewPanel } = {};

    constructor(context: vscode.ExtensionContext, problemDataService: ProblemDataService) {
        this.mediaUri = vscode.Uri.joinPath(context.extensionUri, "media");
        this.globalStorageUri = context.globalStorageUri;
        this.styleMainUri = vscode.Uri.joinPath(context.extensionUri, "media", "main.css");
        this.scriptUri = vscode.Uri.joinPath(context.extensionUri, "media", "script.js");
        this.mathjaxConfig = vscode.Uri.joinPath(context.extensionUri, "media", "mathjax.config.js");
        this.problemDataService = problemDataService;
    }

    public showProblem(problemNumber?: string | number) {
        if (!problemNumber) {
            this._showError(problemNumber);
            return;
        }
        let id = +problemNumber;
        if (!id) {
            this._showError(id);
            return;
        }
        if (this._problemViewExists(id)) {
            this._openExistingView(id);
            return;
        }

        this._showWebView(id);
    }

    public _openExistingView(id: number) {
        const view = this.visibleProblems[id];
        if (!view) {
            throw new Error(`Problem view ${id} not found`);
        }
        view.reveal();
    }

    private _showError(problemNumber?: string | number) {
        vscode.window.showErrorMessage(`Couldn't find Problem ${problemNumber}`);
    }

    private _registerProblemView(id: number, view: vscode.WebviewPanel) {
        this.visibleProblems[id] = view;

        view.webview.onDidReceiveMessage(
            (message) => {
                if (message["problem"]) {
                    vscode.commands.executeCommand(Command.Show, message["problem"]);
                } else if (message["download"]) {
                    const uri = vscode.Uri.parse('resource:' + message["filename"] + "?resource=" + message["download"]);
                    vscode.workspace.openTextDocument(uri).then((doc) => {
                        vscode.window.showTextDocument(doc);
                    });
                }
            }
        );

        view.onDidDispose(() => {
            delete this.visibleProblems[id];
        });
    }

    private _problemViewExists(id: number): boolean {
        return !!this.visibleProblems[id];
    }

    private async _loadProblemHtml(webview: vscode.Webview, id: number) {
        const $ = cheerio.load(await this.problemDataService.loadProblemHtml(id));

        // fix <img src="...">
        $("img").each((_, image) => {
            if (image.attribs && image.attribs.src && (image.attribs.src.startsWith("/resources") || image.attribs.src.startsWith("resources"))) {
                let path = image.attribs.src;
                image.attribs.src = `${webview.asWebviewUri(vscode.Uri.joinPath(this.problemDataService.getStorageUri(), path))}`;
            }
        });

        return $.html();
    }

    private async _showWebView(id: number) {
        let panel = vscode.window.createWebviewPanel(
            "eulerProblemView",
            `Problem ${id}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                enableFindWidget: true,
                localResourceRoots: [this.mediaUri, this.globalStorageUri] // restrict resources
            },
        );
        panel.iconPath = vscode.Uri.parse("https://projecteuler.net/favicons/favicon.ico");
        this._registerProblemView(id, panel);
        try {
            const html = await this._loadProblemHtml(panel.webview, id);
            const styleMainUri = panel.webview.asWebviewUri(this.styleMainUri);
            const scriptUri = panel.webview.asWebviewUri(this.scriptUri);
            const mathjaxConfig = panel.webview.asWebviewUri(this.mathjaxConfig);

            let subtitle = "";
            let subtitleData = await this.problemDataService.getTitle(id);
            if (subtitleData) {
                subtitle = `${subtitleData}`;
            } else {
                subtitle = "";
                console.warn("Problem info not found in global state");
            }

            panel.webview.html = `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy"
                        content="default-src 'none';
                        img-src ${panel.webview.cspSource};
                        script-src 'self' 'unsafe-inline' ${panel.webview.cspSource} https://cdn.jsdelivr.net/npm/mathjax@4/ https://cdn.jsdelivr.net/npm/@mathjax/ https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/;
                        style-src 'self' 'unsafe-inline' ${panel.webview.cspSource} https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/styles/ https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css;
                        object-src 'none';
                        base-uri 'self';
                        frame-ancestors 'self';
                        worker-src 'self' blob:;
                        font-src * data: blob: 'unsafe-inline' vscode-webview-resource:;">
                <link href="${styleMainUri}" rel="stylesheet">
                <title>Problem ${id}</title>
            </head>
            <body>
                <div class="content">
                <h2><a href="https://projecteuler.net/problem=${id}">Problem ${id}</a>: ${subtitle}</h2>
                ${html}
                </div>

                <script src="${mathjaxConfig}"></script>
                <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@4/tex-mml-svg.js?config=newcm"></script>

                <script src="${scriptUri}"></script>
            </body>
            </html>`;
        } catch {
            panel.dispose();
            vscode.window.showErrorMessage(`Error loading content for Problem ${id}.`, new RetryShowProblem(id));
        }
    }
}

class RetryShowProblem implements Thenable<void> {

    readonly title: string = "Try Again";
    private id: number;

    constructor(id: number) {
        this.id = id;
    }

    then<TResult1 = void, TResult2 = never>(): PromiseLike<TResult1 | TResult2> {
        return vscode.commands.executeCommand(Command.Show, this.id);
    }
}
