import * as vscode from "vscode";
import * as cheerio from "cheerio";

enum Secrets {
    sessionId = "projecteuler.login.sessionId",
    keepAlive = "projecteuler.login.keepAlive",
}

export class LoginService {

    private _onHeadersChanged: vscode.EventEmitter<Headers> = new vscode.EventEmitter<Headers>();
    readonly onHeadersChanged: vscode.Event<Headers> = this._onHeadersChanged.event;
    private _onLoginChanged: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();
    readonly onLoginChanged: vscode.Event<string | undefined> = this._onLoginChanged.event;

    private headers: Headers;
    private login?: string;

    constructor(
        private context: vscode.ExtensionContext,
    ) {
        this.headers = new Headers();

        this._getHeaders().then((value) => {
            this.headers = value;
            this._onHeadersChanged.fire(this.headers);
        });

        this.onHeadersChanged(() => this.checkLoginStatus());
    }

    public async logout() {
        await this.context.secrets.delete(Secrets.sessionId);
        await this.context.secrets.delete(Secrets.keepAlive);
        this.headers = new Headers();
        this._onHeadersChanged.fire(this.headers);
    }

    public getHeaders(): Headers {
        return this.headers;
    }

    public async setHeaders(sessionId: string, keepAlive: string) {
        await this.context.secrets.store(Secrets.sessionId, sessionId);
        await this.context.secrets.store(Secrets.keepAlive, keepAlive);
        this.headers = await this._getHeaders();
        this._onHeadersChanged.fire(this.headers);
    }

    private async _getHeaders(): Promise<Headers> {
        const headers = new Headers();

        const sessionId = await this.context.secrets.get(Secrets.sessionId);
        const keepAlive = await this.context.secrets.get(Secrets.keepAlive);
        if (sessionId !== undefined && keepAlive !== undefined) {
            const value = `__Host-PHPSESSID=${sessionId};keep_alive=${keepAlive}`;
            headers.append("Cookie", value);
        }

        return headers;
    }

    private _updateLogin(login?: string) {
        if (login !== this.login) {
            this.login = login;
            this._onLoginChanged.fire(this.login);
        }
    }

    public checkLoginStatus() {
        fetch("https://projecteuler.net/about", { headers: this.headers }).then((response) => {
            console.log(response);
            if (response.ok) {
                response.text().then((text) => {
                    // console.log(text);
                    if (text) {
                        const $ = cheerio.load(text);
                        const login = $("#info_panel").children("strong").text();
                        if (login) {
                            this._updateLogin(login);
                        } else {
                            this._updateLogin(undefined);
                        }
                    }
                }).catch((_) => {
                    this._updateLogin(undefined);
                });
            } else {
                this._updateLogin(undefined);
            }
        }).catch((reason) => {
            console.log("Rejected");
            console.log(reason);
            this._updateLogin(undefined);
        });
    }
}