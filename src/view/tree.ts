import * as vscode from "vscode";
import { ProblemData, ProblemDataService } from "../service";
import { ProblemDataTreeItem, Problem, StoredData, Folder, folderToTreeItem, problemToTreeItem, ProblemItem, SubItem } from "../view";
import { Command, ContextConfigurable, Icons } from "../config";

class ProblemTreeWorkspaceState {
    static readonly key: string = "projecteuler.problemView.state";

    constructor(
        public listRoot: StoredData,
        public treeRoot: StoredData,
        public listProblemsContext: boolean,
    ) { }

    static getState(context: vscode.ExtensionContext): ProblemTreeWorkspaceState {
        const state = context.workspaceState.get(this.key);
        console.log(state);
        if (state) {
            return state as ProblemTreeWorkspaceState;
        } else {
            const workspaceState = new ProblemTreeWorkspaceState(
                {
                    folders: [],
                    problems: [],
                },
                {
                    folders: [],
                    problems: [],
                },
                false
            );
            ProblemTreeWorkspaceState.storeState(workspaceState, context);
            return workspaceState;
        }
    }

    static storeState(state: ProblemTreeWorkspaceState, context: vscode.ExtensionContext) {
        context.workspaceState.update(ProblemTreeWorkspaceState.key, state);
    }
}

export class ProblemTreeDataProvider implements ContextConfigurable, vscode.TreeDataProvider<SubItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<void | SubItem | SubItem[] | null | undefined> = new vscode.EventEmitter();
    readonly onDidChangeTreeData: vscode.Event<void | SubItem | SubItem[] | null | undefined> =
        this._onDidChangeTreeData.event;

    private root: StoredData;
    private state: ProblemTreeWorkspaceState;
    private lookup: { [key: string]: vscode.TreeItem };
    private data: ProblemData[];

    constructor(
        private context: vscode.ExtensionContext,
        private problemDataService: ProblemDataService,
    ) {
        this.data = this.problemDataService.getProblemInfo();
        this.state = ProblemTreeWorkspaceState.getState(context);
        if (this.state.listProblemsContext) {
            this.root = this.state.treeRoot;
        } else {
            this.root = this.state.listRoot;
        }
        this.lookup = {};
        vscode.commands.executeCommand("setContext", "projecteuler.listProblems", this.state.listProblemsContext);
        this.problemDataService.onProblemDataChanged(() => {
            if (this.state.listProblemsContext) {
                this.groupProblems();
            } else {
                this.listProblems();
            }
            this.refresh();
        });
        this.onDidChangeTreeData(() => {
            // const state = new ProblemTreeWorkspaceState(this.root, this.listProblemsContext);
            ProblemTreeWorkspaceState.storeState(this.state, this.context);
        });
    }

    // private _getTreeItems(): ProblemDataTreeItem[] {
    //     return [
    //         ...this.root.folders.map((folder) => folderToTreeItem(folder, this.lookup)),
    //         ...this.root.problems.filter((problem) => problem !== null).map((problem) => problemToTreeItem(problem)),
    //     ];
    // }

    configure(context: vscode.ExtensionContext): void {

        context.extension.packageJSON
        const view = vscode.window.createTreeView("projecteuler.problemView", {
            treeDataProvider: this,
            canSelectMany: true,
            // dragAndDropController: this,
            showCollapseAll: true,
        });

        view.onDidCollapseElement((expansionEvent) => {
            expansionEvent.element.state = vscode.TreeItemCollapsibleState.Collapsed;
            this.lookup[expansionEvent.element.id].iconPath = Icons.folder;
            this._onDidChangeTreeData.fire(expansionEvent.element);
        });
        view.onDidExpandElement((expansionEvent) => {
            expansionEvent.element.state = vscode.TreeItemCollapsibleState.Expanded;
            this.lookup[expansionEvent.element.id].iconPath = Icons.folder;
            this._onDidChangeTreeData.fire(expansionEvent.element);
        });

        context.subscriptions.push(
            view,
            vscode.commands.registerCommand(Command.GroupProblems, this.groupProblems, this),
            vscode.commands.registerCommand(Command.UngroupProblems, this.listProblems, this),
        );
    }

    groupProblems() {
        this.state.listProblemsContext = true;
        vscode.commands.executeCommand("setContext", "projecteuler.listProblems", this.state.listProblemsContext);
        this.root = this.state.treeRoot;
        this._onDidChangeTreeData.fire();
    }

    listProblems() {
        this.state.listProblemsContext = false;
        vscode.commands.executeCommand("setContext", "projecteuler.listProblems", this.state.listProblemsContext);
        this.root = this.state.listRoot;
        this._onDidChangeTreeData.fire();
    }

    // handleDrag(source: readonly ProblemItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Thenable<void> | void {
    //     console.log(source);
    //     if (source) {
    //         const sources = source.filter((item) => item.item.data).map((item) => item.item.data);
    //         if (sources.length > 0) {
    //             dataTransfer.set("application/vnd.code.tree.projecteuler.problemView", new vscode.DataTransferItem(sources));
    //         }
    //     }
    // }

    // handleDrop(target: ProblemDataTreeItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Thenable<void> | void {
    //     console.log(`drop ${target}`);
    //     token.onCancellationRequested((ev) => {
    //         console.log("cancelled drag");
    //         console.log(ev);
    //     });
    // }

    refresh(): void {
        this.data = this.problemDataService.getProblemInfo();
        this.state.listRoot = this._listProblems();
        this.state.treeRoot = this._groupProblems();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SubItem): vscode.TreeItem {
        if (element.state) {
            const folder = element as Folder;
            const folderItem = folderToTreeItem(folder, {});
            this.lookup[folderItem.id] = folderItem;
            return folderItem;
        } else {
            const problem = element as Problem;
            return problemToTreeItem(problem);
        }
    }

    getChildren(element?: SubItem | undefined): vscode.ProviderResult<SubItem[]> {
        if (element) {
            if (element.state) {
                const folder = element as Folder;
                return [
                    ...folder.subFolders,
                    ...folder.problems
                ];
            }
        } else {
            return [
                ...this.root.folders,
                ...this.root.problems,
            ];
        }
    }

    private _listProblems(): StoredData {
        // this.state = new ProblemTreeWorkspaceState(new StoredData([], []), {}, true);
        const list: StoredData = {
            folders: [],
            problems: [],
        }
        list.problems = this.data.filter((element) => element !== null).map((element) => {
            const id = crypto.randomUUID();
            return {
                id: id,
                data: element,
            };
        });
        return list;
    }

    private _groupProblems(): StoredData {
        const data = this.problemDataService.getProblemInfo().filter((element) => element !== null);
        const chunk = (arr: ProblemData[], size: number) =>
            Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );
        const chunks = chunk(data, 100);
        this.lookup = {};
        const group: StoredData = {
            folders: [],
            problems: [],
        };
        for (const problemChunk of chunks) {
            const smallerChunks = chunk(problemChunk, 10);
            const label = `Problems ${problemChunk[0].ID} - ${problemChunk[problemChunk.length - 1].ID}`;
            const subFolders: Folder[] = [];
            const problems: Problem[] = [];
            const folder = {
                name: label,
                subFolders,
                problems,
                id: crypto.randomUUID(),
                state: vscode.TreeItemCollapsibleState.Collapsed
            };
            for (const smallerChunk of smallerChunks) {
                const label = `Problems ${smallerChunk[0].ID} - ${smallerChunk[smallerChunk.length - 1].ID}`;
                const subFolders: Folder[] = [];
                const problems: Problem[] = [];
                const smallerfolder = {
                    name: label,
                    subFolders,
                    problems,
                    id: crypto.randomUUID(),
                    state: vscode.TreeItemCollapsibleState.Collapsed
                };
                for (const data of smallerChunk) {
                    problems[data.ID] = {
                        data,
                        id: crypto.randomUUID(),
                        parentFolderId: folder.id,
                    };
                }
                folder.subFolders.push(smallerfolder);
            }
            group.folders.push(folder);
        }
        return group;
    }
}

export class ProblemTreeDecorationProvider implements ContextConfigurable, vscode.FileDecorationProvider {
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

    configure(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.window.registerFileDecorationProvider(this),
        );
    }
}
