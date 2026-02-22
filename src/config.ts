import * as vscode from "vscode";

export enum Command {
    Search = "projecteuler.searchProblem",
    Show = "projecteuler.showProblem",
    Refresh = "projecteuler.refreshMetadata",
    Clear = "projecteuler.clearMetadata",
}

export class Uri {
    static basePath: vscode.Uri = vscode.Uri.parse("https://projecteuler.net");
    static metadataPath: vscode.Uri = vscode.Uri.joinPath(this.basePath, "minimal=problems");
    static iconPath = vscode.Uri.joinPath(this.basePath, "favicons", "favicon.ico");
}
