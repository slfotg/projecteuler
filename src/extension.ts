import * as vscode from "vscode";
import { Command } from "./config";
import { ProblemTreeDataProvider, ProblemTreeDecorationProvider, ProblemViewProvider } from "./view";
import { ProblemDataService } from "./service";
import { EulerLensProvider } from "./lens";

async function searchProblem() {
    const problemNumber = await vscode.window
        .showInputBox({
            placeHolder: "Enter Problem #",
        });
    if (problemNumber) {
        vscode.commands.executeCommand(Command.Show, problemNumber);
    };
}

export function activate(context: vscode.ExtensionContext) {
    vscode.languages.registerCodeLensProvider("*", new EulerLensProvider());
    const dataService = new ProblemDataService(context);
    const viewProvider = new ProblemViewProvider(context, dataService);
    context.subscriptions.push(
        vscode.commands.registerCommand(Command.Search, searchProblem),
        viewProvider.register(),
    );

    dataService.updateProblemInfo().then(() => {
        vscode.window.registerTreeDataProvider("projecteuler.problemView", new ProblemTreeDataProvider(dataService));
    });
    vscode.window.registerFileDecorationProvider(new ProblemTreeDecorationProvider());
    context.secrets;
}

// This method is called when your extension is deactivated
export function deactivate() { }
