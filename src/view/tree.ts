import * as vscode from "vscode";
import { Command } from "../config";
import { ProblemData, ProblemDataService } from "../service";

export class ProblemTreeDataProvider implements vscode.TreeDataProvider<ProblemData> {
    private _onDidChangeTreeData: vscode.EventEmitter<void | ProblemData | ProblemData[] | null | undefined> =
        new vscode.EventEmitter<void | ProblemData | ProblemData[] | null | undefined>();
    readonly onDidChangeTreeData: vscode.Event<void | ProblemData | ProblemData[] | null | undefined> =
        this._onDidChangeTreeData.event;

    private data: ProblemData[];

    constructor(
        private problemDataService: ProblemDataService,
        private context: vscode.ExtensionContext,
    ) {
        let data = this.context.workspaceState.get("euler.problemData");
        if (data) {
            this.data = data as ProblemData[];
        } else {
            this.data = [];
        }
        this.problemDataService.onProblemDataChanged(() => this.refresh());
    }

    refresh(): void {
        this.data = this.problemDataService.getProblemInfo();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProblemData): vscode.TreeItem {
        let item = new vscode.TreeItem(`${element.ID}:`);
        item.description = `${element.Title}`;
        item.resourceUri = vscode.Uri.parse(
            `https://projecteuler.net/problem=${element.ID}?solved=${element["Solve Status"]}`,
        );
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
            return Promise.resolve(this.data);
        }
    }
}

export class ProblemTreeDecorationProvider implements vscode.FileDecorationProvider {
    onDidChangeFileDecorations?: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> | undefined;
    provideFileDecoration(
        uri: vscode.Uri,
        token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.FileDecoration> {
        if (uri.scheme === "https" && uri.authority === "projecteuler.net") {
            for (const param of uri.query.split("&")) {
                if (param.trim() === "solved=1") {
                    return new vscode.FileDecoration("✓", "Problem Solved", new vscode.ThemeColor("charts.green"));
                }
            }
        }
        return null;
    }
}
