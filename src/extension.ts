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

	context.subscriptions.push(
		register('code-search.search', async() => codeSearch())
	);
}

/**
 * Main function of this extension
 */
async function codeSearch(): Promise<void> {
	var codeSearchResults: CodeSearchResult[] = new Array();

	// Get input
	const wordInput = vscode.window.showInputBox({ignoreFocusOut:true});
	
	//const browserLaunch = puppeteer.launch();
	const browserLaunch = puppeteer.launch({headless:false});		// 目視確認用

	const browser = await browserLaunch;
	const word = await wordInput;
	if(!word)return;
	const page = await browser.newPage();

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
		for(let result of searchResults){
			var url = new URL(result.href);
			if(url.hostname!="qiita.com")continue;
			promises.push(subPageBrowse(url.href, result.title));
		}
		await Promise.all(promises);

		// End
		console.log("全部終了！！けっかはっっっぴょーっっ！！！！！");
		console.log(codeSearchResults);

		vscode.window.showInformationMessage('無事終了');

	}catch (e) {
		// Ouput error to console
		console.log(e);

		// Close browser and exit
		await browser.close();
		process.exit(200);
	}
	// Close browser
	await browser.close();

	/**
	 * Manages the browsing on subPages
	 */
	async function subPageBrowse(url: string, title: string|null){
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

// this method is called when your extension is deactivated
export function deactivate() {}
