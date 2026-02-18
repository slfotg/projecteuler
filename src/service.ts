import * as vscode from "vscode";
import Papa from "papaparse";

export interface ProblemData {
    "ID": number,
    "Title": string,
    "Published"?: string,
    "Solved By"?: number,
    "Solve Status"?: number,
}

export class ProblemDataService {
    private static problemInfoKey: string = "euler.problem-info";
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public getProblemInfo(): { [key: number]: ProblemData } {
        return this.context.globalState.get(ProblemDataService.problemInfoKey) as { [key: number]: ProblemData };
    }

    public getTitle(id: number | string): string {
        return this.getProblemInfo()[+id].Title;
    }

    private async _fetchData() {
        let response = await fetch("https://projecteuler.net/minimal=problems");
        return await response.text();
    }

    public async updateProblemInfo() {
        let problemInfo: { [key: string]: ProblemData } = {};
        let text: string = await this._fetchData();

        var data = Papa.parse<ProblemData>(text, {
            delimiter: "##",
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
        });

        for (var record of data.data) {
            problemInfo[record.ID] = record;
        }

        this.context.globalState.update(ProblemDataService.problemInfoKey, problemInfo);
    }
}