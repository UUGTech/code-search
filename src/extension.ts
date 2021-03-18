import * as vscode from 'vscode';
import * as puppeteer from 'puppeteer';
import { URL } from 'url';

/**
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 			 ======= TO DO ========
 *
 * 
 *			 - Qiita 以外のサイトに対応
 * 
 *			 - コピーボタンの作成(code-frameごと)
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 */

// Results
interface CodeSearchResult {
	title:string|null
	url:string
	codes:string[]
}

export function activate(context: vscode.ExtensionContext) {
	const register = vscode.commands.registerCommand;

	context.subscriptions.push(
		register('code-search.search', async() => {
			CodeSearchPanel.createOrShow(context.extensionUri)
			if(CodeSearchPanel.currentPanel){
				await CodeSearchPanel.currentPanel.search();
			}
		})
	);
}



/**
 * Manages code-search results panel
 */
class CodeSearchPanel{
	public static currentPanel: CodeSearchPanel | undefined;

	public static readonly viewType = 'codeSearch';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private _codeSearchResults: CodeSearchResult[] = new Array();

	/**
	 * constructor
	 */
	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri){
		this._panel = panel;
		this._extensionUri = extensionUri;

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

	}



	/**
	 * Function which is executed when the panel is closed
	 */
	public dispose(){
		CodeSearchPanel.currentPanel = undefined;		// Set currentPanel as undefined
		this._codeSearchResults = [];					// Make the array of results empty

		// Clean up
		this._panel.dispose();

		// Dispose all disposables
		while(this._disposables.length){
			const x = this._disposables.pop();
			if(x) x.dispose();
		}

	}

	public revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri){
		CodeSearchPanel.currentPanel = new CodeSearchPanel(panel, extensionUri);
	}


	/**
	 * (1) If we already have a panel, show it.
	 * (2) Otherwise, create a new one.
	 */
	public static createOrShow(extensionUri: vscode.Uri){
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		// (1)
		if(CodeSearchPanel.currentPanel){
			CodeSearchPanel.currentPanel._panel.reveal(column);
			return;
		}


		// (2)
		const panel = vscode.window.createWebviewPanel(
			CodeSearchPanel.viewType,
			'Code Search',
			{viewColumn: column || vscode.ViewColumn.One, preserveFocus: true},
			Object.assign(getWebviewPanelOptions(), getWebviewOptions(extensionUri))
		);

		CodeSearchPanel.currentPanel = new CodeSearchPanel(panel, extensionUri);
	}

	/**
	 * Makes base html of result webview
	 */
	private _makeBaseHtml(webView: vscode.Webview){
		console.log('====make_base_html=====');
		// css js uri
		const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'message.js');
		const scriptPrettifyPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'prettify.js');
		const styleResultsPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'results.css');
		const stylePrettifyPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'TomorrowNightEighties.css');

		const scriptUri = webView.asWebviewUri(scriptPathOnDisk);
		const scriptPrettifyUri = webView.asWebviewUri(scriptPrettifyPath);
		const styleResultsUri = webView.asWebviewUri(styleResultsPath);
		const stylePrettifyUri = webView.asWebviewUri(stylePrettifyPath);
		const nonce = getNonce();

		var html = `
			<!DOCTYPE html>
			<html lang="ja">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webView.cspSource}; img-src ${webView.cspSource} https:; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResultsUri}" rel="stylesheet">
				<script nonce="${nonce}" src="${scriptPrettifyUri}"></script>
				<link href="${stylePrettifyUri}" rel="stylesheet">
				<title>code-search</title>
			</head>
			<body>
				<h1>Code-Search</h1>
				<div id="results-div"></div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
				<script nonce="${nonce}">
				window.addEventListener("load", function() {
					PR.prettyPrint();
				});
				</script>
			</body>
			</html>
		`;
		return html;
	}

	/**
	 * Searches using puppeteer
	 */
	public async search(){
		// Get input
		const wordInput = vscode.window.showInputBox({ignoreFocusOut:true});
		
		const browserLaunch = puppeteer.launch();
		//const browserLaunch = puppeteer.launch({headless:false});		// 目視確認用

		const browser = await browserLaunch;
		const word = await wordInput;
		const page = await browser.newPage();
		const webView = this._panel.webview;
		if(!word)return;
		if(!webView)return;
		webView.html = this._makeBaseHtml(this._panel.webview);
		try {
			// Visit Google
			await page.goto('https://www.google.co.jp', {waitUntil: 'networkidle2', timeout: 5000});
			await page.waitForSelector('input[name=q]');

			// Search
			await page.type('input[name=q]', word);
			await page.keyboard.press('Enter');
			await page.waitForNavigation({waitUntil: 'networkidle2', timeout: 5000});

			// Get search results
			const searchResults = await page.$$eval(".g > div > div > a", (list) => list.map((elm) => {
				return {
					href: (elm as HTMLLinkElement).href as string,
					title: (elm as HTMLLinkElement).querySelector("h3")?.textContent as string
				};
			}));

			// Subpage browsing
			var promises = [];
			for(let [index,result] of searchResults.entries()){
				var url = new URL(result.href);
				if(url.hostname!="qiita.com")continue;
				promises.push(this._subPageBrowse(url.href, result.title, index, browser, webView));
			}
			await Promise.all(promises);

			// End
			vscode.window.showInformationMessage('無事終了');

		}catch (e) {
			// Output error to console
			console.log(e);

			// Close browser and exit
			await browser.close();
			process.exit(200);
		}
		// Close browser
		await browser.close();
	}

	private async _subPageBrowse(url: string, title: string|null, index: Number, browser: puppeteer.Browser, webView: vscode.Webview){
		const subPage = await browser.newPage();
		try {
			// Add title on webviewPanel
			webView.postMessage({command:'addTitle', title:title, num:index});
			webView.postMessage({command:'addLink', url:url, num:index});
			// Visit
			await subPage.goto(url, {timeout: 50000});
			await subPage.waitForSelector("div.code-frame > div.highlight");
	
			// Get codes described at the page
			const codeContents = await subPage.$$eval("div.code-frame > div.highlight", (lsit)=>lsit.map((elm)=>{
				const content = (elm as HTMLElement).textContent;
				if(typeof(content)==='string')return (elm as HTMLElement).textContent;
			}));
			var codes: string[] = new Array();
			for(let content of codeContents)if(typeof(content)==="string")codes.push(content);

			// Add codes on webviewPanel
			if(codes.length){
				for(let code of codes){
					webView.postMessage({command:'addCode', code:code, num:index});
				}
			}
			
			// Push results
			const result: CodeSearchResult = {title: title, url: url, codes: codes};
			this._codeSearchResults.push(result);

			// Close
			await subPage.close();
		} catch (e) {
			console.log(e);
			await subPage.close();
		}
	}
}


// Returns a nonce
function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

// Returns webview options
function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,

		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
	};
}

// Returns WebviewPanelOptions
function getWebviewPanelOptions(): vscode.WebviewPanelOptions{
	return {
		// Keep the webview panel's content even when the panel become hidden
		retainContextWhenHidden: true
	}
}