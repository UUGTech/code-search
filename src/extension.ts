// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as puppeteer from 'puppeteer';
import { URL } from 'url';

// Results
interface CodeSearchResult {
	title:string|null
	url:string
	codes:string[]
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const register = vscode.commands.registerCommand;
	const extensionUri = context.extensionUri;

	context.subscriptions.push(
		register('code-search.search', async() => codeSearch(extensionUri))
	);
}

/**
 * Main function of this extension
 */
async function codeSearch(extensionUri: vscode.Uri): Promise<void> {
	var codeSearchResults: CodeSearchResult[] = new Array();

	// Get input
	const wordInput = vscode.window.showInputBox({ignoreFocusOut:true});
	
	const browserLaunch = puppeteer.launch();
	//const browserLaunch = puppeteer.launch({headless:false});		// 目視確認用

	const browser = await browserLaunch;
	const word = await wordInput;
	const page = await browser.newPage();
	const webviewPanel = makeWebviewPanel(extensionUri);
	if(!word)return;

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
			promises.push(subPageBrowse(url.href, result.title, index));
		}
		await Promise.all(promises);

		// End
		console.log(codeSearchResults);

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

	//====================== functions ============================
	/**
	 * Manages the browsing on subPages
	 */
	async function subPageBrowse(url: string, title: string|null, index: Number){
		const subPage = await browser.newPage();
		try {
			// Visit
			await subPage.goto(url, {waitUntil: 'networkidle2', timeout: 50000});
	
			// Get codes described at the page
			const codeContents = await subPage.$$eval("div.code-frame > div.highlight", (lsit)=>lsit.map((elm)=>{
				const content = (elm as HTMLElement).textContent;
				if(typeof(content)==='string')return (elm as HTMLElement).textContent;
			}));
			var codes: string[] = new Array();
			for(let content of codeContents)if(typeof(content)==="string")codes.push(content);

			if(codes.length){
				webviewPanel.webview.postMessage({command:'addTitle', title:title, num:index});
				for(let code of codes){
					webviewPanel.webview.postMessage({command:'addCode', code:code, num:index});
				}
			}
			
			// Deal with codes
			const result: CodeSearchResult = {title: title, url: url, codes: codes};
			codeSearchResults.push(result);

			// Close
			await subPage.close();
		} catch (e) {
			console.log(e);
			await subPage.close();
		}
	}
}

function makeWebviewPanel(extensionUri: vscode.Uri){
	const viewType = 'html';
	const title = 'code-search';
	const viewColumn = vscode.ViewColumn.Two;
	const webviewPanel = vscode.window.createWebviewPanel(viewType, title, {viewColumn: viewColumn, preserveFocus: true}, getWebviewOptions(extensionUri));
	// css js uri
	const scriptPathOnDisk = vscode.Uri.joinPath(extensionUri, 'media', 'message.js');
	const styleResultsPath = vscode.Uri.joinPath(extensionUri, 'media', 'results.css');
	const scriptUri = webviewPanel.webview.asWebviewUri(scriptPathOnDisk);
	const styleResultsUri = webviewPanel.webview.asWebviewUri(styleResultsPath);
	const nonce = getNonce();

	var html = `
		<!DOCTYPE html>
		<html lang="ja">
		<head>
			<meta charset="UTF-8">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webviewPanel.webview.cspSource}; img-src ${webviewPanel.webview.cspSource} https:; script-src 'nonce-${nonce}';">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<link href="${styleResultsUri}" rel="stylesheet">
			<title>code-search</title>
		</head>
		<body>
			<h1>Code-Search</h1>
			<div id="results-div"></div>
			<script nonce="${nonce}" src="${scriptUri}"></script>
		</body>
		</html>
	`;
	webviewPanel.webview.html = html;
	return webviewPanel;
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,

		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
	};
}

// this method is called when your extension is deactivated
export function deactivate() {}
