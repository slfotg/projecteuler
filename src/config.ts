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
}

export class Uri {
    static basePath: vscode.Uri = vscode.Uri.parse("https://projecteuler.net");
    static metadataPath: vscode.Uri = vscode.Uri.joinPath(this.basePath, "minimal=problems");
    static iconPath = vscode.Uri.joinPath(this.basePath, "favicons", "favicon.ico");
}
