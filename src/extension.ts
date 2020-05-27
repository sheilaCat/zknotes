// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import {
	exists,
	mkdir,
	writeFile,
	readFile,
	readdir,
	symlink,
	copyFile,
	stat,
} from 'fs';
import { formatDate } from './utils';

import {languages} from 'vscode'
import { linkCompletionProvider } from './linkCompletionProvider';
import { zkDefinitionProvider } from './provideDefinition';
import { zkFoldingRangeProvider } from './zkFoldingRangeProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "zknotes" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('zknotes.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from zknotes!');
	});

	context.subscriptions.push(disposable);


	let createNewNote = vscode.commands.registerCommand('zknotes.newNote', () => {
		// 按照zk默认格式进行新文件创建
		// yyyyMMddHHmmss_dsds
		const root = vscode.workspace.rootPath;

		// 提示输入标题 
		vscode.window.showInputBox({
			placeHolder: 'input your note title',
			prompt: 'enter your zk note title, or esc to cancel'
		}).then((inputValue) => {
			// 在当前目录下创建新的文件

			// 增加时间戳
			const config = vscode.workspace.getConfiguration('zknotes')
			const defaultFormat: string = config.get('defaultFormat') || ''
			const timestamp = formatDate(new Date(), defaultFormat)

			// 如果设置为空 则不增加前缀
			const filename = defaultFormat ? `${timestamp}_${inputValue}` : inputValue
			
			vscode.window.showInputBox({
				value: filename,
				prompt: 'confirm your note title'
			}).then(fullFilename => {
				writeFile(`${root}/${fullFilename}.md`, '', () => {
					vscode.window.showInformationMessage('success!')
				})
			})
		})

	});

	context.subscriptions.push(createNewNote)

	/**
	 * links 键入`[`时自动补全
	 */
	const linkAutocompletion = languages.registerCompletionItemProvider(
    'markdown',
    linkCompletionProvider,
    '[',
  );
	context.subscriptions.push(linkAutocompletion);
	

	/**
	 * wiki links 可跳转的链接
	 */

	const zettelLink = languages.registerDefinitionProvider(
		'markdown',
		zkDefinitionProvider
	)
	context.subscriptions.push(zettelLink)
	
	const zettelFold = languages.registerFoldingRangeProvider(
		'markdown',
		zkFoldingRangeProvider
	)
	context.subscriptions.push(zettelFold)
}

// this method is called when your extension is deactivated
export function deactivate() { }
