import * as vscode from "vscode";
import { ProblemDataService } from "../service";
import { ProblemDataTreeItem, Favorites } from "../view";

export class FavoritesDataProvider implements vscode.TreeDataProvider<ProblemDataTreeItem>, vscode.TreeDragAndDropController<ProblemDataTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<void | ProblemDataTreeItem | ProblemDataTreeItem[] | null | undefined> =
        new vscode.EventEmitter<void | ProblemDataTreeItem | ProblemDataTreeItem[] | null | undefined>();
    readonly onDidChangeTreeData: vscode.Event<void | ProblemDataTreeItem | ProblemDataTreeItem[] | null | undefined> =
        this._onDidChangeTreeData.event;

    dropMimeTypes: readonly string[] = ["application/vnd.code.tree.projecteuler.problemView", "text/uri-list"];
    dragMimeTypes: readonly string[] = [];

    private static favoritesKey: string = "projecteuler.favorites";

    favorites: Favorites = {
        folders: {},
        problems: [],
    }

    constructor(
        private problemDataService: ProblemDataService,
        private context: vscode.ExtensionContext,
    ) {
        const favorites = context.workspaceState.get(FavoritesDataProvider.favoritesKey);
        if (favorites) {
            this.favorites = favorites as Favorites;
        }

        this.problemDataService.onProblemDataChanged(() => {
            this._onDidChangeTreeData.fire();
        });
    }

    private _save() {
        this.context.workspaceState.update(FavoritesDataProvider.favoritesKey, this.favorites);
        this._onDidChangeTreeData.fire();
    }

    handleDrop(target: ProblemDataTreeItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Thenable<void> | void {
        const list = dataTransfer.get("text/uri-list");

        if (list) {
            const uris = list.value.split(/\r?\n/).map((uri: string) => vscode.Uri.parse(uri.trim().replace("%3D", "=").replace(".euler", "")));
            for (const uri of uris) {
                if (uri.authority === "projecteuler.net") {
                    const number: string = uri.path.split("=")[1];

                    let node = target;
                    if (node) {
                        if (!node.isFolder) {
                            node = node.parent;
                        }
                    }
                    if (node && node.favorites) {
                        node.favorites.problems[+number] = +number;
                    } else {
                        this.favorites.problems[+number] = +number;
                    }
                }
            }
            this._save();
        }
    }

    getTreeItem(element: ProblemDataTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: ProblemDataTreeItem | undefined): vscode.ProviderResult<ProblemDataTreeItem[]> {
        if (element) {
            return element.children;
        } else {
            let problems = this._toTreeItems(this.favorites);
            if (problems.length > 0) {
                return problems;
            } else {
                return [ProblemDataTreeItem.fromProblemNumber(0, this.problemDataService)]
            }
        }
    }

    getParent(element: ProblemDataTreeItem): vscode.ProviderResult<ProblemDataTreeItem> {
        return element.parent;
    }

    addProblemTreeItem(item: ProblemDataTreeItem) {
        if (item.data) {
            this.favorites.problems[item.data.ID] = item.data.ID;
        }
        this._save();
    }

    deleteProblemTreeItem(item: ProblemDataTreeItem) {
        if (item.data) {
            let parent = item.parent;
            if (parent && parent.favorites) {
                delete parent.favorites.problems[item.data.ID];
            } else {
                delete this.favorites.problems[item.data.ID];
            }
        }
        this._save();
    }

    private _getRoots(target?: ProblemDataTreeItem): string[] {
        let roots: string[] = [];
        if (target) {
            if (target.isFolder) {
                roots.push(target.label);
                let folder = target;
                while (this.getParent(folder)) {
                    let parent = this.getParent(folder) as ProblemDataTreeItem;
                    roots.push(parent.label);
                    folder = parent;
                }
            } else {
                let folder = target;
                while (this.getParent(folder)) {
                    let parent = this.getParent(folder) as ProblemDataTreeItem;
                    roots.push(parent.label);
                    folder = parent;
                }
            }
        }
        roots = roots.reverse();
        return roots;
    }

    newFolder(folderName: string, target?: ProblemDataTreeItem) {
        if (target && target.isFolder && target.favorites) {
            target.favorites.folders[folderName] = {
                folders: {},
                problems: [],
            }
        } else {
            this.favorites.folders[folderName] = {
                folders: {},
                problems: [],
            }
        }
        this._save();
    }


    private _toTreeItems(favorites: Favorites): ProblemDataTreeItem[] {
        let items: ProblemDataTreeItem[] = [];
        let folders = Object.keys(favorites.folders);
        folders.sort();

        for (let folder of folders) {
            let subfolder = ProblemDataTreeItem.newFolder(folder, favorites.folders[folder]);
            for (let subItem of this._toTreeItems(favorites.folders[folder])) {
                subfolder.addChild(subItem);
            }
            items.push(subfolder);
        }

        favorites.problems.filter((value) => value != null).forEach((problemNumber) => items.push(ProblemDataTreeItem.fromProblemNumber(problemNumber, this.problemDataService)));

        return items;
    }

}