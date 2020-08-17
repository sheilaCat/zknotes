// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TextDecoder } from "util";
import * as path from "path";
import { parseFile, parseDirectory, learnFileId } from "./parsing";
import { filterNonExistingEdges, getColumnSetting, getConfiguration } from "./utils";
import { Graph } from "./types";

import {
	// exists,
	// mkdir,
	writeFile,
	// readFile,
	// readdir,
	// symlink,
	// copyFile,
	// stat,
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
				const rootFilename = `${root}/${fullFilename}.md`
				writeFile(rootFilename,  `# ${filename}`, () => {	
					// 写入1级标题后 打开该文件
					vscode.window.showTextDocument(vscode.Uri.file(rootFilename))
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

	/**
	 * show graph
	 */

	context.subscriptions.push(
    vscode.commands.registerCommand("zknotes.graphView", async () => {
      const column = getColumnSetting("showColumn");

      const panel = vscode.window.createWebviewPanel(
        "markdownLinks",
        "Markdown Links",
        column,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      if (vscode.workspace.rootPath === undefined) {
        vscode.window.showErrorMessage(
          "This command can only be activated in open directory"
        );
        return;
      }

      const graph: Graph = {
        nodes: [],
        edges: [],
      };

      await parseDirectory(graph, vscode.workspace.rootPath, learnFileId);
      await parseDirectory(graph, vscode.workspace.rootPath, parseFile);
      filterNonExistingEdges(graph);

      const d3Uri = panel.webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, "static", "d3.min.js"))
      );

      panel.webview.html = await getWebviewContent(context, graph, d3Uri);

      watch(context, panel, graph);
    })
  );

  const shouldAutoStart = getConfiguration("autoStart");

  if (shouldAutoStart) {
    vscode.commands.executeCommand("zknotes.graphView");
  }


}

// this method is called when your extension is deactivated
export function deactivate() { }

const watch = (
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  graph: Graph
) => {
  if (vscode.workspace.rootPath === undefined) {
    return;
  }

  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(vscode.workspace.rootPath, "**/*.md"),
    false,
    false,
    false
  );

  const sendGraph = () => {
    panel.webview.postMessage({
      type: "refresh",
      payload: graph,
    });
  };

  // Watch file changes in case user adds a link.
  watcher.onDidChange(async (event) => {
    await parseFile(graph, event.path);
    filterNonExistingEdges(graph);
    sendGraph();
  });

  watcher.onDidDelete(async (event) => {
    const index = graph.nodes.findIndex((node) => node.path === event.path);
    if (index === -1) {
      return;
    }

    graph.nodes.splice(index, 1);
    graph.edges = graph.edges.filter(
      (edge) => edge.source !== event.path && edge.target !== event.path
    );

    sendGraph();
  });

  vscode.workspace.onDidOpenTextDocument(async (event) => {
    panel.webview.postMessage({
      type: "fileOpen",
      payload: { path: event.fileName },
    });
  });

  vscode.workspace.onDidRenameFiles(async (event) => {
    for (const file of event.files) {
      const previous = file.oldUri.path;
      const next = file.newUri.path;

      for (const edge of graph.edges) {
        if (edge.source === previous) {
          edge.source = next;
        }

        if (edge.target === previous) {
          edge.target = next;
        }
      }

      for (const node of graph.nodes) {
        if (node.path === previous) {
          node.path = next;
        }
      }

      sendGraph();
    }
  });

  panel.webview.onDidReceiveMessage(
    (message) => {
      if (message.type === "click") {
        const openPath = vscode.Uri.file(message.payload.path);
        const column = getColumnSetting("openColumn");

        vscode.workspace.openTextDocument(openPath).then((doc) => {
          vscode.window.showTextDocument(doc, column);
        });
      }
    },
    undefined,
    context.subscriptions
  );

  panel.onDidDispose(() => {
    watcher.dispose();
  });
};

 

async function getWebviewContent(
  context: vscode.ExtensionContext,
  graph: Graph,
  d3Uri: vscode.Uri
) {
  const webviewPath = vscode.Uri.file(
    path.join(context.extensionPath, "static", "webview.html")
  );
  const file = await vscode.workspace.fs.readFile(webviewPath);

  const text = new TextDecoder("utf-8").decode(file);

  const filled = text
    .replace("--REPLACE-WITH-D3-URI--", d3Uri.toString())
    .replace(
      "let nodesData = [];",
      `let nodesData = ${JSON.stringify(graph.nodes)}`
    )
    .replace(
      "let linksData = [];",
      `let linksData = ${JSON.stringify(graph.edges)}`
    );

  return filled;
}
