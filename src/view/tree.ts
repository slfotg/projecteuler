import * as vscode from "vscode";
import { ProblemDataService } from "../service";
import { ProblemDataTreeItem } from "../view";

export class ProblemTreeDataProvider implements vscode.TreeDataProvider<ProblemDataTreeItem>, vscode.TreeDragAndDropController<ProblemDataTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<void | ProblemDataTreeItem | ProblemDataTreeItem[] | null | undefined> =
        new vscode.EventEmitter<void | ProblemDataTreeItem | ProblemDataTreeItem[] | null | undefined>();
    readonly onDidChangeTreeData: vscode.Event<void | ProblemDataTreeItem | ProblemDataTreeItem[] | null | undefined> =
        this._onDidChangeTreeData.event;

    private data: ProblemDataTreeItem[];
    dropMimeTypes: readonly string[] = [];
    dragMimeTypes: readonly string[] = ["application/vnd.code.tree.projecteuler.problemView", "text/uri-list", "text/plain"];

    constructor(
        private problemDataService: ProblemDataService,
        private context: vscode.ExtensionContext,
    ) {
        const data = this.problemDataService.getProblemInfo();
        if (data) {
            this.data = data.filter((element) => element !== null).map((element) => ProblemDataTreeItem.fromProblemData(element));
        } else {
            this.data = [];
        }
        this.problemDataService.onProblemDataChanged(() => this.refresh());
    }

    handleDrag(source: readonly ProblemDataTreeItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Thenable<void> | void {
        if (source) {
            dataTransfer.set("application/vnd.code.tree.projecteuler.problemView", new vscode.DataTransferItem(source));
        }
    }

    refresh(): void {
        const data = this.problemDataService.getProblemInfo();
        this.data = data.filter((element) => element !== null).map((element) => ProblemDataTreeItem.fromProblemData(element));
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProblemDataTreeItem): vscode.TreeItem {
        return element
    }

    getChildren(element?: ProblemDataTreeItem | undefined): vscode.ProviderResult<ProblemDataTreeItem[]> {
        if (element) {
            return Promise.resolve(element.children);
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
