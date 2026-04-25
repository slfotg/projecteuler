import * as vscode from "vscode";
import { Command, Icons } from "../config";
import { ProblemData, ProblemDataService } from "../service";

export * from "./tree";
export * from "./web";

/**
 * Representation of data stored in the global or workspace state
 * for initializing a tree view
 */
export interface StoredData {
    folders: Folder[],
    problems: Problem[],
}

/**
 * Represents a subitem within a folder or in the root.
 * parentFolderId being `undefined` means it's in the root of a treeview.
 */
export interface SubItem {
    id: string,
    parentFolderId?: string,
    state?: vscode.TreeItemCollapsibleState,
}

export class SubItemTransferItem extends vscode.DataTransferItem {
    constructor(
        readonly value: SubItem[]
    ) {
        super(value);
    }
}

/**
 * A folder/subfolder within a treeview.
 * This is the same as RootFolder except with a uniquely identifiable id
 * and a state that can be restored when reloading the workspace.
 */
export interface Folder extends SubItem {
    name: string,
    subFolders: Folder[],
    problems: Problem[],
}

export function folderToTreeItem(folder: Folder, lookup: { [key: string]: ProblemDataTreeItem }): ProblemDataTreeItem {
    const item = {
        item: folder,
        collapsibleState: folder.state,
        label: folder.name,
        contextValue: "euler_folder",
        id: folder.id,
        children: [
            ...folder.subFolders.map((folder) => folderToTreeItem(folder, lookup)),
            ...folder.problems.filter((problem) => problem !== null).map((problem) => problemToTreeItem(problem))
        ],
        iconPath: Icons.getFolderIcon(folder.state),
    };

    lookup[folder.id] = item;

    return item;
}

/**
 * Represent problems within a folder.
 */
export interface Problem extends SubItem {
    data: ProblemData,
}


export function problemToTreeItem(problem: Problem): ProblemItem {
    return {
        label: `Problem ${problem.data.ID}`,
        item: problem,
        id: problem.id,
        contextValue: "euler_problem",
        children: [],
        description: problem.data.Title,
        resourceUri: vscode.Uri.parse(
            `https://projecteuler.net/problem=${problem.data.ID}`,
        ),
        command: {
            title: `Show Problem ${problem.data.ID}`,
            tooltip: `Show Problem ${problem.data.ID}`,
            command: Command.Show,
            arguments: [problem.data.ID],
        },
        tooltip: `Show Problem ${problem.data.ID}`,
        iconPath: Icons.problem,
    };
}

export interface ProblemDataTreeItem extends vscode.TreeItem {
    id: string,
    item: SubItem,
    children: ProblemDataTreeItem[],
}

export interface ProblemItem extends ProblemDataTreeItem {
    item: Problem,
}
