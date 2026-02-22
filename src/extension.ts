import * as vscode from "vscode";
import { Command } from "./config";
import { ProblemTreeDataProvider, ProblemTreeDecorationProvider, ProblemViewProvider } from "./view";
import { ProblemDataService } from "./service";
import { EulerLensProvider } from "./lens";
import { EulerResourceProvider } from "./resource";

async function searchProblem() {
    const problemNumber = await vscode.window.showInputBox({
        placeHolder: "Enter Problem #",
    });
    if (problemNumber) {
        vscode.commands.executeCommand(Command.Show, problemNumber);
    }
}

export function activate(context: vscode.ExtensionContext) {
    vscode.languages.registerCodeLensProvider("*", new EulerLensProvider());
    const dataService = new ProblemDataService(context);
    const viewProvider = new ProblemViewProvider(context, dataService);
    const resourceProvider = new EulerResourceProvider(context);
    const treeProvider = new ProblemTreeDataProvider(dataService, context);
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider("resource", resourceProvider),
        vscode.commands.registerCommand(Command.Search, searchProblem),
        vscode.commands.registerCommand(Command.Show, viewProvider.showProblem, viewProvider),
        vscode.commands.registerCommand(Command.Refresh, dataService.refreshMetadata, dataService),
        vscode.commands.registerCommand(Command.Clear, dataService.clearMetadata, dataService),
    );

    vscode.window.registerTreeDataProvider("projecteuler.problemView", treeProvider);
    vscode.window.registerFileDecorationProvider(new ProblemTreeDecorationProvider());
    dataService.init();
}

// This method is called when your extension is deactivated
export function deactivate() {}
