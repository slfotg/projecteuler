import * as vscode from "vscode";
import { Command } from "./config";
import { ProblemData, ProblemDataService } from "./service";

export class ProblemTreeDataProvider implements vscode.TreeDataProvider<ProblemData> {
    onDidChangeTreeData?: vscode.Event<void | ProblemData | ProblemData[] | null | undefined> | undefined;

    problemDataService: ProblemDataService;

    constructor(problemDataService: ProblemDataService) {
        this.problemDataService = problemDataService;
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

    private styleMainUri: vscode.Uri;
    private scriptUri: vscode.Uri;
    private mathjaxConfig: vscode.Uri;
    private problemDataService: ProblemDataService;

    private visibleProblems: { [key: number]: vscode.WebviewPanel } = {};

    constructor(context: vscode.ExtensionContext, problemDataService: ProblemDataService) {
        this.styleMainUri = vscode.Uri.joinPath(context.extensionUri, "media", "main.css");
        this.scriptUri = vscode.Uri.joinPath(context.extensionUri, "media", "script.js");
        this.mathjaxConfig = vscode.Uri.joinPath(context.extensionUri, "media", "mathjax.config.js");
        this.problemDataService = problemDataService;
    }

    public register(): vscode.Disposable {
        return vscode.commands.registerCommand(Command.Show, this.showProblem, this);
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

        this.problemDataService.getProblemData(id)
            .then((text) => this._showWebView(text, id))
            .catch((_) => this._showError(id));
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
            (id) => {
                vscode.commands.executeCommand(Command.Show, id);
            }
        );

        view.onDidDispose(() => {
            delete this.visibleProblems[id];
        });
    }

    private _problemViewExists(id: number): boolean {
        return !!this.visibleProblems[id];
    }

    private _showWebView(html: string, id: number) {
        let panel = vscode.window.createWebviewPanel(
            "eulerProblemView",
            `Problem ${id}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                enableFindWidget: true,
            },
        );
        this._registerProblemView(id, panel);
        panel.iconPath = vscode.Uri.parse("https://projecteuler.net/favicons/favicon.ico");
        const styleMainUri = panel.webview.asWebviewUri(this.styleMainUri);
        const scriptUri = panel.webview.asWebviewUri(this.scriptUri);
        const mathjaxConfig = panel.webview.asWebviewUri(this.mathjaxConfig);

        let subtitle = "";
        let subtitleData = this.problemDataService.getTitle(id);
        if (subtitleData) {
            subtitle = `${subtitleData}`;
        } else {
            subtitle = "";
            console.warn("Problem info not found in global state");
        }

        let fixedHtml = html.replaceAll('"resources/', '"https://projecteuler.net/resources/');
        fixedHtml = fixedHtml.replaceAll(/href="about=(\w+)"/g, "href=\"https://projecteuler.net/about=$1\"");

        panel.webview.html = `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy"
                        content="default-src 'none';
                        img-src https://projecteuler.net/;
                        script-src 'self' 'unsafe-inline' ${panel.webview.cspSource} https://cdn.jsdelivr.net/npm/mathjax@4/ https://cdn.jsdelivr.net/npm/@mathjax/ https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/;
                        style-src 'self' 'unsafe-inline' ${panel.webview.cspSource} https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/styles/ https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css;
                        object-src 'none';
                        base-uri 'self';
                        frame-ancestors 'self';
                        worker-src 'self' blob:;">
                <link href="${styleMainUri}" rel="stylesheet">
                <title>Problem ${id}</title>
            </head>
            <body>
                <div class="content">
                <h2><a href="https://projecteuler.net/problem=${id}">Problem ${id}</a>: ${subtitle}</h2>
                <div class="problem_content">
                ${fixedHtml}
                </div>
                </div>

                <script src="${mathjaxConfig}"></script>
                <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@4/tex-mml-svg.js?config=newcm"></script>

                <script src="${scriptUri}"></script>
            </body>
            </html>
    `;
    }
}