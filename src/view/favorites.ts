import * as vscode from "vscode";
import { ProblemData, ProblemDataService } from "../service";
import { Folder, folderToTreeItem, Problem, ProblemDataTreeItem, problemToTreeItem, StoredData } from "../view";
import { ContextConfigurable, Command, Icons } from "../config";

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

export class FavoritesDataProvider implements ContextConfigurable, vscode.TreeDataProvider<ProblemDataTreeItem> {
    public _onDidChangeTreeData: vscode.EventEmitter<void | ProblemDataTreeItem | ProblemDataTreeItem[] | null | undefined> =
        new vscode.EventEmitter<void | ProblemDataTreeItem | ProblemDataTreeItem[] | null | undefined>();
    readonly onDidChangeTreeData: vscode.Event<void | ProblemDataTreeItem | ProblemDataTreeItem[] | null | undefined> =
        this._onDidChangeTreeData.event;

    favorites: StoredData;
    problemData: ProblemData[];
    lookup: { [key: string]: ProblemDataTreeItem };
    treeItems: ProblemDataTreeItem[];
    view?: vscode.TreeView<ProblemDataTreeItem>;

    constructor(
        private problemDataService: ProblemDataService,
        private context: vscode.ExtensionContext,
    ) {
        this.problemData = this.problemDataService.getProblemInfo();
        this.favorites = FavoritesWorkspaceState.getState(context, this.problemData);
        this.lookup = {};
        this.treeItems = this.getTreeItems(this.favorites.folders, this.favorites.problems);

        this.problemDataService.onProblemDataChanged(() => {
            this._onDidChangeTreeData.fire();
        });
        this.onDidChangeTreeData(() => FavoritesWorkspaceState.storeState(this.favorites, context));
    }

    getTreeItems(folders: Folder[], problems: Problem[]) {
        return [
            ...folders.map((folder) => folderToTreeItem(folder, this.lookup)),
            ...problems.filter((problem) => problem !== null).map((problem) => problemToTreeItem(problem)),
        ];
    }

    configure(context: vscode.ExtensionContext): void {
        const favorites = vscode.window.createTreeView("projecteuler.favorites", {
            treeDataProvider: this,
            canSelectMany: false,
            dragAndDropController: new FavoritesDragAndDropController(this)
        });

        favorites.onDidCollapseElement((expansionEvent) => {
            expansionEvent.element.item.state = vscode.TreeItemCollapsibleState.Collapsed;
            expansionEvent.element.iconPath = Icons.folder;
            this._onDidChangeTreeData.fire(expansionEvent.element);
        });
        favorites.onDidExpandElement((expansionEvent) => {
            expansionEvent.element.item.state = vscode.TreeItemCollapsibleState.Expanded;
            expansionEvent.element.iconPath = Icons.openFolder;
            this._onDidChangeTreeData.fire(expansionEvent.element);
        });

        this.view = favorites;

        context.subscriptions.push(
            // vscode.commands.registerCommand(Command.NewFolder, this.newFolder, this),
            // vscode.commands.registerCommand(Command.NewSubFolder, this.newSubFolder, this),
            // vscode.commands.registerCommand(Command.AddToFavorites, this.addProblemTreeItem, this),
            // vscode.commands.registerCommand(Command.Delete, this.deleteProblemTreeItem, this),
            // vscode.commands.registerCommand(Command.ClearFavorites, this.clearFavorites, this),
            favorites,
        );
    }

    getTreeItem(element: ProblemDataTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: ProblemDataTreeItem | undefined): vscode.ProviderResult<ProblemDataTreeItem[]> {
        if (element) {
            return element.children;
        } else {
            return this.treeItems;
        }
    }

    getParent(element: ProblemDataTreeItem): vscode.ProviderResult<ProblemDataTreeItem> {
        if (element.item.parentFolderId) {
            return this.lookup[element.item.parentFolderId];
        }
    }

}

class FavoritesDataController {

    constructor(
        readonly favoritesProvider: FavoritesDataProvider,
    ) { }

    async newFolder() {
        let folderName = await vscode.window.showInputBox({
            prompt: "Enter folder name"
        });
        if (folderName) {
            this._newFolder(folderName)
        }
    }

    async newSubFolder(target?: ProblemDataTreeItem) {
        let folderName = await vscode.window.showInputBox({
            prompt: "Enter folder name"
        });
        if (folderName) {
            this._newFolder(folderName, target)
        }
    }

    addProblemTreeItem(item: ProblemDataTreeItem) {
        if (item.item) {
            const problem = {
                ...item.item as Problem,
                id: crypto.randomUUID(),
            }
            this.favoritesProvider.favorites.problems[problem.data.ID] = problem;
            this.favoritesProvider.lookup = {};
            this.favoritesProvider.treeItems = this.favoritesProvider.getTreeItems(this.favoritesProvider.favorites.folders, this.favoritesProvider.favorites.problems);
            this.favoritesProvider._onDidChangeTreeData.fire();
        }
    }

    deleteProblemTreeItem(item: ProblemDataTreeItem) {
        let parent = this.favoritesProvider.getParent(item) as ProblemDataTreeItem;
        let problem = item.item as Problem;
        if (parent) {
            const folder = parent.item as Folder;
            delete folder.problems[problem.data.ID];
            parent.children = this.favoritesProvider.getTreeItems(folder.subFolders, folder.problems);
        } else {
            delete this.favoritesProvider.favorites.problems[problem.data.ID];
            this.favoritesProvider.lookup = {};
            this.favoritesProvider.treeItems = this.favoritesProvider.getTreeItems(this.favoritesProvider.favorites.folders, this.favoritesProvider.favorites.problems);
        }
        this.favoritesProvider._onDidChangeTreeData.fire(parent);
    }

    clearFavorites() {
        this.favoritesProvider.favorites = {
            folders: [],
            problems: [],
        };
        this.favoritesProvider.treeItems = this.favoritesProvider.getTreeItems([], []);
        this.favoritesProvider._onDidChangeTreeData.fire();
    }

    private async _newFolder(folderName: string, target?: ProblemDataTreeItem) {
        const id = crypto.randomUUID();
        if (target && target.item.state) {
            const folder = target.item as Folder;
            folder.subFolders.push({
                state: vscode.TreeItemCollapsibleState.Collapsed,
                name: folderName,
                subFolders: [],
                problems: [],
                id,
            });
            folder.subFolders.sort();
            await this.favoritesProvider.view?.reveal(target, { expand: true, select: false });
            target.children = [
                ...folder.subFolders.map((f) => folderToTreeItem(f, this.favoritesProvider.lookup)),
                ...folder.problems.filter((p) => p !== null).map((p) => problemToTreeItem(p)),
            ];
            this.favoritesProvider._onDidChangeTreeData.fire(target);
        } else {
            this.favoritesProvider.favorites.folders.push({
                state: vscode.TreeItemCollapsibleState.Collapsed,
                name: folderName,
                subFolders: [],
                problems: [],
                id,
            });
            this.favoritesProvider.favorites.folders.sort();
            this.favoritesProvider.treeItems = this.favoritesProvider.getTreeItems(this.favoritesProvider.favorites.folders, this.favoritesProvider.favorites.problems);
            this.favoritesProvider._onDidChangeTreeData.fire();
        }
    }
}

class FavoritesDragAndDropController implements vscode.TreeDragAndDropController<ProblemDataTreeItem> {

    dropMimeTypes: readonly string[] = ["application/vnd.code.tree.projecteuler.problemView", "text/uri-list"];
    dragMimeTypes: readonly string[] = [];

    constructor(
        readonly favoritesProvider: FavoritesDataProvider,
    ) { }

    handleDrag?(source: readonly ProblemDataTreeItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Thenable<void> | void {
        throw new Error("Method not implemented.");
    }

    handleDrop?(target: ProblemDataTreeItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Thenable<void> | void {
        let dropTarget = target;
        let parentFolderId = undefined;
        let targetFolders = this.favoritesProvider.favorites.folders;
        let targetProblems = this.favoritesProvider.favorites.problems;
        if (target) {
            if (target.item.state) {
                const item = target.item as Folder;
                targetFolders = item.subFolders;
                targetProblems = item.problems;
                parentFolderId = target.id;
            } else if (target.item.parentFolderId) {
                dropTarget = this.favoritesProvider.lookup[target.item.parentFolderId];
                const item = dropTarget.item as Folder;
                targetFolders = item.subFolders;
                targetProblems = item.problems;
                parentFolderId = dropTarget.id;
            }
        }

        dataTransfer.forEach((item, mimeType) => {
            console.log(mimeType);
            console.log(item);
        });
        const problems = this._getProblems(dataTransfer, parentFolderId);
        if (problems) {
            for (const problem of problems) {
                targetProblems[problem.data.ID] = problem;
            }
        }
        if (dropTarget) {
            dropTarget.children = this.favoritesProvider.getTreeItems(targetFolders, targetProblems);
        } else {
            this.favoritesProvider.treeItems = this.favoritesProvider.getTreeItems(targetFolders, targetProblems);
        }
        this.favoritesProvider._onDidChangeTreeData.fire();
    }

    _getProblems(dataTransfer: vscode.DataTransfer, parentFolderId?: string): Problem[] | undefined {
        const problemViewData = dataTransfer.get("application/vnd.code.tree.projecteuler.problemView");
        const favoritesViewData = dataTransfer.get("application/vnd.code.tree.projecteuler.favorites");
        const uriData = dataTransfer.get("text/uri-list");

        if (problemViewData) {
            const problemData: ProblemData[] = JSON.parse(problemViewData.value);
            return problemData.map((data) => {
                return {
                    id: crypto.randomUUID(),
                    data,
                    parentFolderId,
                };
            });
        } else if (favoritesViewData) {
            console.log(favoritesViewData);
        } else if (uriData) {
            const uris: vscode.Uri[] = uriData.value.split(/\r?\n/).map((uri: string) => vscode.Uri.parse(uri.trim().replace("%3D", "=").replace(".euler", "")));
            return uris.filter((uri) => uri.authority === "projecteuler.net")
                .map((uri) => {
                    const number: string = uri.path.split("=")[1];
                    const data = this.favoritesProvider.problemData[+number];
                    return {
                        id: crypto.randomUUID(),
                        data,
                        parentFolderId,
                    };
                });
        }
        return undefined;
    }

}