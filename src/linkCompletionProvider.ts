import {
  CompletionItem,
  SnippetString,
  CompletionItemProvider,
  workspace
} from 'vscode';

export const linkCompletionProvider: CompletionItemProvider = {
  async provideCompletionItems() {
    const rootPath = workspace.rootPath;
    if (!rootPath) {
      return [];
    }

    let allFiles = await workspace.findFiles('**/*.md')
    const fileReg = /(\d{12})_.+/
    // 匹配所有zk文件名
    allFiles = allFiles.filter(f => fileReg.test(f.path))

    let result = [] as CompletionItem[]
    allFiles.map(f => {
      const name = f.path.replace(/.+(\d{12}.+.).md$/, '$1')
      result.push({
        label: name,
        insertText: name
      })
    })

    return result
  },
};
