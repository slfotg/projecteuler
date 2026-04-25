import * as vscode from "vscode";
import { Folder, folderToTreeItem, Problem, problemToTreeItem, StoredData, SubItem, SubItemTransferItem } from ".";
import { ProblemData, ProblemDataService } from "../service";
import { Icons } from "../config";

export class TestDataProvider implements vscode.TreeDataProvider<SubItem>, vscode.TreeDragAndDropController<SubItem> {

    _onDidChangeTreeData: vscode.EventEmitter<SubItem | SubItem[] | undefined> = new vscode.EventEmitter();
    onDidChangeTreeData: vscode.Event<SubItem | SubItem[] | undefined> =
        this._onDidChangeTreeData.event;

    root: StoredData;
    problemData: ProblemData[];
    subItemLookup: { [key: string]: SubItem };
    lookup: { [key: string]: vscode.TreeItem };
    dropMimeTypes: readonly string[] = ["text/uri-list"];
    dragMimeTypes: readonly string[] = ["application/vnd.code.tree.projecteuler.favorites"];

    constructor(
        private context: vscode.ExtensionContext,
        private problemDataService: ProblemDataService,
    ) {
        this.problemData = this.problemDataService.getProblemInfo();
        this.root = FavoritesWorkspaceState.getState(context, this.problemData);
        this.lookup = {};
        this.subItemLookup = {};

        this.problemDataService.onProblemDataChanged(() => {
            this._onDidChangeTreeData.fire(undefined);
        });
    }

    configure(context: vscode.ExtensionContext): void {
        const favorites = vscode.window.createTreeView("projecteuler.favorites", {
            treeDataProvider: this,
            canSelectMany: false,
            dragAndDropController: this,
        });
        console.log(favorites);

        favorites.onDidCollapseElement((expansionEvent) => {
            expansionEvent.element.state = vscode.TreeItemCollapsibleState.Collapsed;
            this.lookup[expansionEvent.element.id].iconPath = Icons.folder;
            this._onDidChangeTreeData.fire(expansionEvent.element);
        });
        favorites.onDidExpandElement((expansionEvent) => {
            expansionEvent.element.state = vscode.TreeItemCollapsibleState.Expanded;
            this.lookup[expansionEvent.element.id].iconPath = Icons.openFolder;
            this._onDidChangeTreeData.fire(expansionEvent.element);
        });

        context.subscriptions.push(
            // vscode.commands.registerCommand(Command.NewFolder, this.newFolder, this),
            // vscode.commands.registerCommand(Command.NewSubFolder, this.newSubFolder, this),
            // vscode.commands.registerCommand(Command.AddToFavorites, this.addProblemTreeItem, this),
            // vscode.commands.registerCommand(Command.Delete, this.deleteProblemTreeItem, this),
            // vscode.commands.registerCommand(Command.ClearFavorites, this.clearFavorites, this),
            favorites,
        );
    }

    getTreeItem(element: SubItem): vscode.TreeItem {
        if (element.state) {
            const folder = element as Folder;
            const folderItem = folderToTreeItem(folder, {});
            this.lookup[folderItem.id] = folderItem;
            this.subItemLookup[folderItem.id] = element;
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

    getParent(element: SubItem): vscode.ProviderResult<SubItem> {
        if (element.parentFolderId) {
            return this.subItemLookup[element.parentFolderId];
        }
        return undefined;
    }

    handleDrag(source: SubItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Thenable<void> | void {
        dataTransfer.set("application/vnd.code.tree.projecteuler.favorites", new SubItemTransferItem(source));
    }

    handleDrop(target: SubItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Thenable<void> | void {
        const problemViewData = dataTransfer.get("application/vnd.code.tree.projecteuler.favorites");
        const uriData = dataTransfer.get("text/uri-list");
        console.log(problemViewData);
        console.log(uriData);
        console.log(target);
    }
}

interface Favorites {
    folders: { [key: string]: Favorites },
    problems: number[]
}

function toStoredData(favorites: Favorites, problemData: ProblemData[], parentFolderId?: string): StoredData {
    const folders: Folder[] = [];
    const problems: Problem[] = [];
    for (const name in favorites.folders) {
        const id = crypto.randomUUID();
        const sub = toStoredData(favorites.folders[name], problemData, id)
        const folder = {
            parentFolderId,
            state: vscode.TreeItemCollapsibleState.Collapsed,
            name,
            subFolders: sub.folders,
            problems: sub.problems,
            id,
        };
        folders.push(folder);
    }

    for (const problemNumber in favorites.problems) {
        if (favorites.problems[+problemNumber]) {
            problems[+problemNumber] = {
                parentFolderId,
                data: problemData[problemNumber],
                id: crypto.randomUUID(),
            };
        }
    }

    folders.sort();
    return {
        folders,
        problems,
    };
}

class FavoritesWorkspaceState {
    static readonly key: string = "projecteuler.favorites.state";
    static readonly oldKey: string = "projecteuler.favorites";

    static getState(context: vscode.ExtensionContext, problemData: ProblemData[]): StoredData {
        const state = context.workspaceState.get(FavoritesWorkspaceState.key);
        console.log(state);
        if (state) {
            return state as StoredData;
        } else {
            const favorites = context.workspaceState.get(FavoritesWorkspaceState.oldKey);
            if (favorites) {
                const data = toStoredData(favorites as Favorites, problemData);
                FavoritesWorkspaceState.storeState(data, context);
                context.workspaceState.update(FavoritesWorkspaceState.oldKey, undefined);
                return data;
            } else {
                const data = {
                    folders: [],
                    problems: [],
                };
                this.storeState(data, context);
                return data;
            }
        }
    }

    static storeState(storedData: StoredData, context: vscode.ExtensionContext) {
        context.workspaceState.update(FavoritesWorkspaceState.key, storedData);
        const state = context.workspaceState.get(FavoritesWorkspaceState.key);
        console.log("Stored:");
        console.log(state);
    }
}