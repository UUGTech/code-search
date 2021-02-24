// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as puppeteer from 'puppeteer';
import { URL } from 'url';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const register = vscode.commands.registerCommand;

	context.subscriptions.push(
		register('code-search.search', async() => searchWithGoogle())
	);
}

async function searchWithGoogle(): Promise<void> {
	const word = await vscode.window.showInputBox();
	if(!word)return;
	const browser = await puppeteer.launch({headless:false});
	const page = await browser.newPage();
	try {
		// Visit Google
		await page.goto('https://www.google.co.jp', {waitUntil: 'networkidle2', timeout: 5000});
		await page.waitForSelector('input[name=q]');

		// Search
		await page.type('input[name=q]', word);
		// Enter
		await page.keyboard.press('Enter');
		await page.waitForNavigation({waitUntil: 'networkidle2', timeout: 5000});
		
		// Output hrefs
		const results = await page.$$eval(".g > div > div > a", (list) => list.map((elm) => {
			return {
				href: (elm as HTMLLinkElement).href,
				title: (elm as HTMLLinkElement).querySelector("h3")?.textContent
			};
		}));

		let promises = [];
		for(let result of results){
			var url = new URL(result.href);
			if(url.hostname!="qiita.com")continue;
			promises.push((async ()=>{
				const subPage = await browser.newPage();
				try {
					await subPage.goto(result.href, {waitUntil: 'networkidle2', timeout: 50000});
					console.log(`visited: ${await subPage.title()}`);
					await subPage.close();
				} catch (e) {
					console.log(e);
					await subPage.close();
				}
			})());
		}
		await Promise.all(promises);
		console.log("全部終わったんや");

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
}

// this method is called when your extension is deactivated
export function deactivate() {}
