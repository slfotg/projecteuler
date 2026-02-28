import * as vscode from "vscode";
import { Command } from "./config";
import { ProblemDataTreeItem, ProblemTreeDataProvider, ProblemTreeDecorationProvider, ProblemViewProvider } from "./view";
import { ProblemData, ProblemDataService } from "./service";
import { EulerLensProvider } from "./lens";
import { EulerResourceProvider } from "./resource";
import { FavoritesDataProvider } from "./view/favorites";

interface SearchItem extends vscode.QuickPickItem {
    id: number,
    label: string,
    description: string
}

async function search(this: ProblemDataService) {
    const problemData: ProblemData[] = this.getProblemInfo();
    const items = problemData.filter((data) => data !== null).map((data) => {
        return {
            id: data.ID,
            label: `Problem ${data.ID}`,
            description: data.Title,
        } as SearchItem
    });
    vscode.window.showQuickPick(items,
        {
            title: `Search Euler Problems`,
            placeHolder: "Problem Number or description",
            ignoreFocusOut: true,
            matchOnDescription: true,
            matchOnDetail: true,
        }).then((selected) => { if (selected) { vscode.commands.executeCommand(Command.Show, selected?.id) } });
}

async function newSubFolder(this: FavoritesDataProvider, target?: ProblemDataTreeItem) {
    let folderName = await vscode.window.showInputBox({
        prompt: "Enter folder name"
    });
    if (folderName) {
        this.newFolder(folderName, target)
    }
}

async function newFolder(this: FavoritesDataProvider) {
    let folderName = await vscode.window.showInputBox({
        prompt: "Enter folder name"
    });
    if (folderName) {
        this.newFolder(folderName)
    }
}

export function activate(context: vscode.ExtensionContext) {
    vscode.languages.registerCodeLensProvider("*", new EulerLensProvider());
    const dataService = new ProblemDataService(context);
    const viewProvider = new ProblemViewProvider(context, dataService);
    const resourceProvider = new EulerResourceProvider(context);
    const treeProvider = new ProblemTreeDataProvider(dataService, context);

    const view = vscode.window.createTreeView("projecteuler.problemView", {
        treeDataProvider: treeProvider,
        canSelectMany: true,
        dragAndDropController: treeProvider
    });

    const favoritesProvider = new FavoritesDataProvider(dataService, context);
    const favorites = vscode.window.createTreeView("projecteuler.favorites", {
        treeDataProvider: favoritesProvider,
        canSelectMany: false,
        dragAndDropController: favoritesProvider
    });
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider("resource", resourceProvider),
        vscode.commands.registerCommand(Command.Search, search, dataService),
        vscode.commands.registerCommand(Command.Pick, search, dataService),
        vscode.commands.registerCommand(Command.Show, viewProvider.showProblem, viewProvider),
        vscode.commands.registerCommand(Command.Refresh, dataService.refreshMetadata, dataService),
        vscode.commands.registerCommand(Command.Clear, dataService.clearMetadata, dataService),
        vscode.commands.registerCommand(Command.NewFolder, newFolder, favoritesProvider),
        vscode.commands.registerCommand(Command.NewSubFolder, newSubFolder, favoritesProvider),
        vscode.commands.registerCommand(Command.AddToFavorites, favoritesProvider.addProblemTreeItem, favoritesProvider),
        vscode.commands.registerCommand(Command.Delete, favoritesProvider.deleteProblemTreeItem, favoritesProvider),
        vscode.window.registerFileDecorationProvider(new ProblemTreeDecorationProvider()),
        view,
        favorites,
    );
}

// This method is called when your extension is deactivated
export function deactivate() { }
