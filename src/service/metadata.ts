import * as vscode from "vscode";
import Papa from "papaparse";
import * as config from "../config";

export interface ProblemData {
    ID: number;
    Title: string;
    Published?: string;
    "Solved By"?: number;
    "Solve Status"?: number;
}

export class ProblemDataService {
    private _onProblemDataChanged: vscode.EventEmitter<ProblemData[] | undefined> = new vscode.EventEmitter<
        ProblemData[] | undefined
    >();
    readonly onProblemDataChanged: vscode.Event<ProblemData[] | undefined> = this._onProblemDataChanged.event;

    private static problemInfoKey: string = "euler.problem-info";
    private context: vscode.ExtensionContext;
    private titles: { [key: number]: string } = {};

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public init() {
        // use finally in case site is down, then we can use previously cached metadata if it exists
        this.refreshMetadata().finally(() => this._updateTitles());
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
        this._setMetadata(undefined);
    }

    public getProblemInfo(): ProblemData[] {
        const data = this.context.globalState.get(ProblemDataService.problemInfoKey);
        if (data) {
            return data as ProblemData[];
        } else {
            return [];
        }
    }

    public getTitle(id: number | string): string {
        return this.titles[+id] ? this.titles[+id] : "";
    }

    private _updateTitles() {
        this.titles = {};
        let problemInfo: ProblemData[] = this.getProblemInfo();
        problemInfo.forEach((problemData) => (this.titles[problemData.ID] = problemData.Title));
    }

    private _setMetadata(problemData?: ProblemData[]) {
        this.context.globalState.update(ProblemDataService.problemInfoKey, problemData);
        this._updateTitles();
        this._onProblemDataChanged.fire(problemData);
    }

    private async _fetchData(): Promise<string> {
        let response = await fetch(config.Uri.metadataPath.toString());
        return await response.text();
    }
}
