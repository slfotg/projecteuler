import * as vscode from "vscode";
import { Command } from "../config";
import { ProblemData, ProblemDataService } from "../service";

export * from "./tree";
export * from "./web";

export interface Favorites {
    folders: { [key: string]: Favorites },
    problems: number[]
}

export class ProblemDataTreeItem extends vscode.TreeItem {

    public children: ProblemDataTreeItem[] = [];
    public parent?: ProblemDataTreeItem;
    public data?: ProblemData;
    public favorites?: Favorites;

    constructor(
        public readonly label: string,
        public readonly isFolder: boolean,
        public readonly collapsibleState?: vscode.TreeItemCollapsibleState,
    ) {
        super(label, collapsibleState)
    }

    public addChild(child: ProblemDataTreeItem) {
        if (this.isFolder) {
            this.children.push(child);
            child.parent = this;
        }
    }

    public static newFolder(label: string, favorites: Favorites): ProblemDataTreeItem {
        var item = new ProblemDataTreeItem(label, true, vscode.TreeItemCollapsibleState.Collapsed);
        item.contextValue = "euler_folder";
        item.favorites = favorites;
        return item;
    }

    public static fromProblemData(element?: ProblemData): ProblemDataTreeItem {
        if (element) {
            let item = new ProblemDataTreeItem(`Problem ${element.ID}`, false);
            item.data = element;
            item.description = `${element.Title}`;
            item.resourceUri = vscode.Uri.parse(
                `https://projecteuler.net/problem=${element.ID}.euler`,
            );
            item.command = {
                title: `Show Problem ${element.ID}`,
                tooltip: `Show Problem ${element.ID}`,
                command: Command.Show,
                arguments: [element.ID],
            };
            item.tooltip = `Show Problem ${element.ID}`;
            item.contextValue = "euler_problem";
            item.iconPath = new vscode.ThemeIcon("euler-problem", new vscode.ThemeColor("button.foreground"));
            return item;
        } else {
            return new ProblemDataTreeItem("", false);
        }
    }

    public static fromProblemNumber(problemNumber: number, dataService: ProblemDataService): ProblemDataTreeItem {
        return this.fromProblemData(dataService.getProblemInfo()[problemNumber]);
    }
}