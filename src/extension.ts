// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as puppeteer from 'puppeteer';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "code-search" is now active!');

	const register = vscode.commands.registerCommand;

	context.subscriptions.push(
		register('code-search.search', async() => searchWithGoogle())
	);
}

async function searchWithGoogle(): Promise<void> {
	const word = "vscode extension api";
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

		// Output hrefs
		const hrefs = await page.$$eval(".g a", (list) => list.map((elm) => (elm as HTMLLinkElement).href));
		for(let i=0; i<2; i++){
			vscode.window.showInformationMessage(hrefs[i]);
		}
		vscode.window.showInformationMessage('これらが結果です');

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
