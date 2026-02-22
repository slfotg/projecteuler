import * as vscode from "vscode";
import * as cheerio from "cheerio";
import * as config from "../config";

interface Resource {
    downloadUri: vscode.Uri;
    path: vscode.Uri;
}

interface ProblemResources {
    id: number;
    htmlPath: vscode.Uri;
    resources: Resource[];
}

export class ResourceCacheService {
    constructor(readonly globalStorageUri: vscode.Uri) {}

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
        let target = vscode.Uri.joinPath(this.globalStorageUri, downloadUri.path);
        await vscode.workspace.fs.writeFile(target, bytes);

        return {
            downloadUri: downloadUri,
            path: target,
        };
    }

    storedProblemUri(id: number) {
        return vscode.Uri.joinPath(this.globalStorageUri, "problems", `${id}.html`);
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
            if (image.attribs?.src.startsWith("/resources") || image.attribs?.src.startsWith("resources")) {
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
                        link.attribs.href = `${vscode.Uri.joinPath(config.Uri.basePath, href)}`;
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
        let resources = await Promise.all(
            resourceUris.map((fileUri) => {
                let downloadUri = config.Uri.basePath.with({
                    path: fileUri.path,
                    query: fileUri.query,
                    fragment: fileUri.fragment,
                });
                return this.downloadResource(downloadUri);
            }),
        );

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
