import * as vscode from "vscode";
import { ProblemTreeDataProvider, ProblemTreeDecorationProvider, ProblemViewProvider } from "./view";
import { ProblemDataService } from "./service";
import { EulerLensProvider } from "./lens";
import { FavoritesDataProvider } from "./view/favorites";
import { TestDataProvider } from "./view/test";

export function activate(context: vscode.ExtensionContext) {
    vscode.languages.registerCodeLensProvider("*", new EulerLensProvider());
    const dataService = new ProblemDataService(context);
    const viewProvider = new ProblemViewProvider(context, dataService);
    const treeProvider = new ProblemTreeDataProvider(context, dataService);
    // const favoritesProvider = new FavoritesDataProvider(dataService, context);
    const treeDecorator = new ProblemTreeDecorationProvider();

    const testProvider = new TestDataProvider(context, dataService);

    dataService.configure(context);
    viewProvider.configure(context);
    treeProvider.configure(context);
    // favoritesProvider.configure(context);
    treeDecorator.configure(context);
    testProvider.configure(context);
}

// This method is called when your extension is deactivated
export function deactivate() { }
