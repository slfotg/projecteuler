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

    public async getProblemData(id: string | number): Promise<string> {
        let response = await this._fetchProblem(id);
        return new Promise<string>((resolve, reject) => {
            if (response.status !== 200) {
                reject();
            }
            response.text()
                .then((text) => {
                    if (text !== "Data for that problem cannot be found") {
                        resolve(text);
                    } else {
                        reject();
                    }
                })
                .catch((_) => reject());
        });
    }

    public getTitle(id: number | string): string {
        return this.getProblemInfo()[+id].Title;
    }

    private async _fetchProblem(id: string | number): Promise<Response> {
        const url = `https://projecteuler.net/minimal=${id}`;
        return await fetch(url);
    }

    private async _fetchData(): Promise<string> {
        let response = await fetch("https://projecteuler.net/minimal=problems");
        return await response.text();
    }

    public async updateProblemInfo() {
        let problemInfo: { [key: number]: ProblemData } = {};
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