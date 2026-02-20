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

interface Resource {
    downloadUri: vscode.Uri,
    path: vscode.Uri,
}

interface ProblemResources {
    id: number,
    htmlPath: vscode.Uri,
    resources: Resource[],
}

export class ProblemDataService {
    public static basePath: vscode.Uri = vscode.Uri.parse("https://projecteuler.net");
    private static problemInfoKey: string = "euler.problem-info";
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public getStorageUri() {
        return this.context.globalStorageUri;
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


    /**
     * Retries 3 times to download from a Uri
     * @param downloadUri 
     * @returns Response from server
     */
    async getOkResponse(downloadUri: string): Promise<Response> {
        let status;
        for (let i = 0; i < 3; i += 1) {
            let response = await fetch(downloadUri);
            status = response.status;
            if (response.ok) {
                return response;
            }
        }
        throw new Error(`Response status: ${status} for ${downloadUri}`);
    }

    async downloadResource(downloadUri: vscode.Uri): Promise<Resource> {
        let response = await this.getOkResponse(downloadUri.toString());
        let bytes = await response.bytes();
        let target = vscode.Uri.joinPath(this.getStorageUri(), downloadUri.path);
        await vscode.workspace.fs.writeFile(target, bytes);

        return {
            downloadUri: downloadUri,
            path: target,
        };
    }

    storedProblemUri(id: number) {
        return vscode.Uri.joinPath(this.getStorageUri(), "problems", `${id}.html`);
    }

    /**
     * Downloads the minimal html of problem `id` and any resources found to globalStorageUri
     * @param id - The problem id
     * @returns The modified html for the problem
     */
    async downloadProblem(id: number): Promise<string> {
        let response = await this.getOkResponse(`https://projecteuler.net/minimal=${id}`);
        const $ = cheerio.load(`<div class="problem_content">${await response.text()}</div>`);
        let resourceUris: vscode.Uri[] = [];

        // fix <img src="...">
        $("img").each((_, image) => {
            if (image.attribs && image.attribs.src && (image.attribs.src.startsWith("/resources") || image.attribs.src.startsWith("resources"))) {
                let fileUri = vscode.Uri.parse(image.attribs.src);
                resourceUris.push(fileUri);
                // store with file path only
                // let the webview be responsible for fixing this
                image.attribs.src = fileUri.path;
            }
        });

        // fix <a href="...">
        $("a").each((_, link) => {
            if (link.attribs) {
                let href = link.attribs.href;
                if (href) {
                    if (href.startsWith("about")) {
                        // about pages need absolute paths right now.
                        // these are not stored locally
                        link.attribs.href = `${vscode.Uri.joinPath(ProblemDataService.basePath, href)}`;
                    } else if (href.startsWith("/resources") || href.startsWith("resources")) {
                        // added class for custom functionality to open in new editor
                        link.attribs.class = "linked-resource";
                        let fileUri = vscode.Uri.parse(href);
                        resourceUris.push(fileUri);
                        link.attribs.href = fileUri.path;
                    }
                }
            }
        });

        // Download all resources at the same time
        let resources = await Promise.all(resourceUris.map((fileUri) => {
            let downloadUri = ProblemDataService.basePath.with({ path: fileUri.path, query: fileUri.query, fragment: fileUri.fragment });
            return this.downloadResource(downloadUri);
        }));
        console.log("All downloads successful");
        console.log(resources);

        let html = $.html();

        await vscode.workspace.fs.writeFile(this.storedProblemUri(id), Buffer.from(html));
        return html;
    }

    public async loadProblemHtml(id: number) {
        let uri = this.storedProblemUri(id);
        return await (async () => {
            try {
                // TODO - should maybe use the file stats to determine if we should re-cache the problem data
                let _stat = await vscode.workspace.fs.stat(uri);
                return (await vscode.workspace.fs.readFile(uri)).toString();
            } catch {
                for (let i = 0; i < 3; i += 1) {
                    try {
                        return await this.downloadProblem(id);
                    } catch {
                        // do nothing
                    }
                }
                throw new Error(`Failed to get problem html for problem #${id}`);
            }
        })();
    }
}
