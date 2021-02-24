// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as puppeteer from 'puppeteer';

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
	const browser = await puppeteer.launch();
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
		console.log("title");
		console.log(await page.title());

		// Output hrefs
		const results = await page.$$eval(".g > div > div > a", (list) => list.map((elm) => {
			return {
				href: (elm as HTMLLinkElement).href,
				title: (elm as HTMLLinkElement).querySelector("h3")?.textContent
			};
		}));
		var titles = "";
		var links = "";
		for(const result of results){
			titles += result.title + "\n";
			links += result.href + "\n";
		}
		console.log("titles");
		console.log(titles);
		console.log("links");
		console.log(links);

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
