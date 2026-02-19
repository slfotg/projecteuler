import * as vscode from "vscode";
import * as cheerio from "cheerio";
import Papa from "papaparse";
import { Command } from "./config";

export interface ProblemData {
    "ID": number,
    "Title": string,
    "Published"?: string,
    "Solved By"?: number,
    "Solve Status"?: number,
}

export class ProblemDataService {
    public static basePath: vscode.Uri = vscode.Uri.parse("https://projecteuler.net");
    private static problemInfoKey: string = "euler.problem-info";
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public clearProblemInfo(): void {
        this.context.globalState.update(ProblemDataService.problemInfoKey, undefined);
        vscode.commands.executeCommand(Command.Refresh);
    }

    public getProblemInfo(): { [key: number]: ProblemData } {
        const data = this.context.globalState.get(ProblemDataService.problemInfoKey);
        if (data) {
            return data as { [key: number]: ProblemData };
        } else {
            return {};
        }
    }

    private async _download(source: vscode.Uri, path: string): Promise<vscode.Uri> {
        let target = vscode.Uri.joinPath(this.context.globalStorageUri, path);
        try {
            await vscode.workspace.fs.stat(target);
        } catch {
            let response = await fetch(source.toString());
            let content = await response.bytes();
            vscode.workspace.fs.writeFile(target, content);
        }
        return target;
    }

    private async _downloadContent(text: string, panel: vscode.WebviewPanel): Promise<string> {
        const $ = cheerio.load(`<div class="problem_content">${text}</div>`);
        {
            let images = $("img");
            for (let i = 0; i < images.length; i += 1) {
                if (images[i].attribs && images[i].attribs.src && images[i].attribs.src.startsWith("resources")) {
                    let path = vscode.Uri.parse(images[i].attribs.src).path;
                    let uri = vscode.Uri.joinPath(ProblemDataService.basePath, path);
                    let target = await this._download(uri, path);
                    let srcUri = panel.webview.asWebviewUri(target);
                    images[i].attribs.src = `${srcUri}`;
                }
            }
        }

        {
            let links = $("a");
            for (let i = 0; i < links.length; i += 1) {
                if (links[i].attribs) {
                    let href = links[i].attribs.href;
                    if (href) {
                        if (href.startsWith("about")) {
                            links[i].attribs.href = `${vscode.Uri.joinPath(ProblemDataService.basePath, href)}`;
                        } else if (href.startsWith("resources")) {
                            let path = vscode.Uri.parse(links[i].attribs.href).path;
                            let uri = vscode.Uri.joinPath(ProblemDataService.basePath, path);
                            await this._download(uri, path);
                            links[i].attribs.class = "linked-resource";
                        }
                    }
                }
            }
        }

        return $.html();
    }

    public async getProblemData(id: string | number, panel: vscode.WebviewPanel): Promise<string> {
        let target = vscode.Uri.joinPath(this.context.globalStorageUri, "problems", `${id}.html`);
        try {
            await vscode.workspace.fs.stat(target);
            const problemData = await vscode.workspace.fs.readFile(target);
            return `${problemData}`;
        } catch {
            const response = await this._fetchProblem(id);
            const text = await response.text();
            const problemHtml = await this._downloadContent(text, panel);
            vscode.workspace.fs.writeFile(target, Buffer.from(problemHtml));
            return problemHtml;
        }
    }

    public async getTitle(id: number | string): Promise<string> {
        let problemInfo = this.getProblemInfo();
        if (Object.keys(problemInfo).length === 0) {
            await this.updateProblemInfo();
            problemInfo = this.getProblemInfo();
            return (problemInfo && problemInfo[+id]) ? problemInfo[+id].Title : "";
        } else {
            return problemInfo[+id] ? problemInfo[+id].Title : "";
        }
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
        await vscode.commands.executeCommand(Command.Refresh);
    }
}