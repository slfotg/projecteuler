import * as vscode from "vscode";
import { Command } from "./config";
import { ProblemTreeDataProvider, ProblemTreeDecorationProvider, ProblemViewProvider } from "./view";
import { ProblemData, ProblemDataService } from "./service";
import { EulerLensProvider } from "./lens";
import { EulerResourceProvider } from "./resource";

interface SearchItem extends vscode.QuickPickItem {
    id: number,
    label: string,
    description: string
}

async function search(this: ProblemDataService) {
    const problemData: ProblemData[] = this.getProblemInfo();
    const items = problemData.map((data) => {
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

export function activate(context: vscode.ExtensionContext) {
    vscode.languages.registerCodeLensProvider("*", new EulerLensProvider());
    const dataService = new ProblemDataService(context);
    const viewProvider = new ProblemViewProvider(context, dataService);
    const resourceProvider = new EulerResourceProvider(context);
    const treeProvider = new ProblemTreeDataProvider(dataService, context);
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider("resource", resourceProvider),
        vscode.commands.registerCommand(Command.Search, search, dataService),
        vscode.commands.registerCommand(Command.Pick, search, dataService),
        vscode.commands.registerCommand(Command.Show, viewProvider.showProblem, viewProvider),
        vscode.commands.registerCommand(Command.Refresh, dataService.refreshMetadata, dataService),
        vscode.commands.registerCommand(Command.Clear, dataService.clearMetadata, dataService),
    );

    vscode.window.registerTreeDataProvider("projecteuler.problemView", treeProvider);
    vscode.window.registerFileDecorationProvider(new ProblemTreeDecorationProvider());
    dataService.init();
}

// This method is called when your extension is deactivated
export function deactivate() { }
