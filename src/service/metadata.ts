import * as vscode from "vscode";
import Papa from "papaparse";
import * as config from "../config";

export interface SearchItem extends vscode.QuickPickItem {
    id: number,
    label: string,
    description: string
}

export interface ProblemData {
    ID: number;
    Title: string;
    Published?: string;
    "Solved By"?: number;
    "Solve Status"?: number;
}

export interface ProblemMetadata {
    version?: string,
    problemData: ProblemData[],
}

export class ProblemDataService implements config.ContextConfigurable {
    private _onProblemDataChanged: vscode.EventEmitter<ProblemData[] | undefined> = new vscode.EventEmitter<
        ProblemData[] | undefined
    >();
    readonly onProblemDataChanged: vscode.Event<ProblemData[] | undefined> = this._onProblemDataChanged.event;

    private static currentVersion: string = "1";
    private static problemInfoKey: string = "euler.problem-info";
    private context: vscode.ExtensionContext;
    private metadata: ProblemMetadata = {
        version: ProblemDataService.currentVersion,
        problemData: []
    };

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this._init();
    }

    configure(context: vscode.ExtensionContext): void {
        console.log("Registering commands for metadata service");
        context.subscriptions.push(
            vscode.commands.registerCommand(config.Command.Search, this.search, this),
            vscode.commands.registerCommand(config.Command.Pick, this.search, this),
            vscode.commands.registerCommand(config.Command.Refresh, this.refreshMetadata, this),
            vscode.commands.registerCommand(config.Command.Clear, this.clearMetadata, this),
        );
    }

    public async search() {
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
            }).then((selected) => { if (selected) { vscode.commands.executeCommand(config.Command.Show, selected?.id) } });
    }

    private _init() {
        const data = this.context.globalState.get(ProblemDataService.problemInfoKey) as ProblemMetadata;
        if (data.version && data.version === ProblemDataService.currentVersion) {
            this.metadata = data;
        } else {
            this.refreshMetadata();
        }
    }

    public async refreshMetadata() {
        let text: string = await this._fetchData();
        var data = Papa.parse<ProblemData>(text, {
            delimiter: "##",
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
        });

        this._setMetadata(data.data);
    }

    public clearMetadata(): void {
        this.context.globalState.update(ProblemDataService.problemInfoKey, undefined);
    }

    public getProblemInfo(): ProblemData[] {
        return this.metadata.problemData;
    }

    public getTitle(id: number | string): string {
        return this.metadata?.problemData[+id] ? this.metadata?.problemData[+id].Title : "";
    }

    private _setMetadata(problemData: ProblemData[]) {
        for (const problem of problemData) {
            this.metadata.problemData[problem.ID] = problem;
        }
        this.context.globalState.update(ProblemDataService.problemInfoKey, this.metadata);
        this._onProblemDataChanged.fire(problemData);
    }

    private async _fetchData(): Promise<string> {
        let response = await fetch(config.Uri.metadataPath.toString());
        return await response.text();
    }
}
