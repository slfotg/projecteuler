import * as vscode from "vscode";
import { Command } from "./config";
import { ProblemDataTreeItem, ProblemTreeDataProvider, ProblemTreeDecorationProvider, ProblemViewProvider } from "./view";
import { ProblemData, ProblemDataService } from "./service";
import { EulerLensProvider } from "./lens";
import { EulerResourceProvider } from "./resource";
import { FavoritesDataProvider } from "./view/favorites";
import { LoginService } from "./service/login";
import { LoginViewProvider } from "./view/login";

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
    const loginService = new LoginService(context);
    // loginService.setHeaders("asdf", "Asgahg");
    const dataService = new ProblemDataService(context, loginService);
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
    const loginView = new LoginViewProvider(context.extensionUri, loginService);
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
        vscode.window.registerWebviewViewProvider(LoginViewProvider.viewType, loginView),
        vscode.commands.registerCommand(Command.Login, loginService.setHeaders, loginService),
        vscode.commands.registerCommand(Command.Logout, loginService.logout, loginService),
    );
    loginService.onLoginChanged((login) => {
        console.log(`Logged in as "${login}"`);
        if (login) {
            vscode.commands.executeCommand('setContext', 'euler-is-logged-in', true);
        } else {
            vscode.commands.executeCommand('setContext', 'euler-is-logged-in', true);
        }
    });

    // loginService.setHeaders("84e325abc853c8cb156dc0d9b086457c", "1772049052%23219584%23enm8f9IPHHgmAYF6T7YFRolMuLV60bfV");
    // loginService.setHeaders("f5a9a57fcea661d21db5851dbb833588", "1772395633%232221906%23UdeNknuiQx4mpe9RrZpSZ9VvkFvgNivq");
}

// This method is called when your extension is deactivated
export function deactivate() { }
