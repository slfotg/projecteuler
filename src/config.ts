import * as vscode from "vscode";

export enum Command {
    Search = "projecteuler.searchProblem",
    Pick = "projecteuler.pickProblem",
    Show = "projecteuler.showProblem",
    Refresh = "projecteuler.refreshMetadata",
    Clear = "projecteuler.clearMetadata",
    NewFolder = "projecteuler.newFolder",
    NewSubFolder = "projecteuler.newSubFolder",
    AddToFavorites = "projecteuler.addToFavorites",
    Delete = "projecteuler.deleteFromFavorites",
    GroupProblems = "projecteuler.groupProblems",
    UngroupProblems = "projecteuler.ungroupProblems",
    ClearFavorites = "projecteuler.clearFavorites",
}

export class Uri {
    static basePath: vscode.Uri = vscode.Uri.parse("https://projecteuler.net");
    static metadataPath: vscode.Uri = vscode.Uri.joinPath(this.basePath, "minimal=problems");
    static iconPath = vscode.Uri.joinPath(this.basePath, "favicons", "favicon.ico");
}

export interface ContextConfigurable {
    configure(context: vscode.ExtensionContext): void;
}

export class Icons {
    static folder = new vscode.ThemeIcon("folder", new vscode.ThemeColor("euler.folderColor"));
    static openFolder = new vscode.ThemeIcon("folder-opened", new vscode.ThemeColor("euler.folderColor"));
    static problem = new vscode.ThemeIcon("euler-problem", new vscode.ThemeColor("euler.iconColor"));

    static getFolderIcon(state?: vscode.TreeItemCollapsibleState): vscode.ThemeIcon {
        if (state === vscode.TreeItemCollapsibleState.Expanded) {
            return Icons.openFolder;
        } else {
            return Icons.folder;
        }
    }
}