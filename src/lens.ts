import * as vscode from "vscode";
import { Command } from "./config";

class EulerLens extends vscode.CodeLens {
    constructor(range: vscode.Range, problemNumber: string) {
        super(range);
        this.command = {
            title: `Problem ${problemNumber}`,
            tooltip: `Show Problem ${problemNumber}`,
            command: Command.Show,
            arguments: [problemNumber],
        };
    }
}

export class EulerLensProvider implements vscode.CodeLensProvider {
    private readonly idRegex: RegExp = /((pe|problem=|problem = )([1-9]\d*))/g;
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> =
        new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> =
        this._onDidChangeCodeLenses.event;

    private enabled = true;

    constructor() {
        vscode.workspace.onDidChangeConfiguration((_) => {
            this.enabled = vscode.workspace
                .getConfiguration("projecteuler")
                .get("enableCodeLens", true);
            this._onDidChangeCodeLenses.fire();
        });
    }

    public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        if (this.enabled) {
            let codeLenses = [];
            const regex = new RegExp(this.idRegex);
            const text = document.getText();
            let matches;
            while ((matches = regex.exec(text)) !== null) {
                const line = document.lineAt(
                    document.positionAt(matches.index).line,
                );
                const indexOf = line.text.indexOf(matches[0]);
                const position = new vscode.Position(line.lineNumber, indexOf);
                const range = document.getWordRangeAtPosition(
                    position,
                    new RegExp(this.idRegex),
                );
                if (range) {
                    codeLenses.push(new EulerLens(range, matches[3]));
                }
            }
            return codeLenses;
        } else {
            return [];
        }
    }

    public resolveCodeLens(codeLens: vscode.CodeLens, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
        if (this.enabled) {
            return codeLens;
        } else {
            return null;
        }
    }
}