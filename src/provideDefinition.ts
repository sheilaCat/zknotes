
const vscode = require('vscode');
const path = require('path');

import {DefinitionProvider, ProviderResult, Definition, DefinitionLink, workspace} from 'vscode'

export const zkDefinitionProvider: DefinitionProvider = {
  provideDefinition(document, position, token): ProviderResult<Definition | DefinitionLink[]> {
    const fileName	= document.fileName;
    const workDir	 = path.dirname(fileName);
    const word		= document.getText(document.getWordRangeAtPosition(position));
    const line		= document.lineAt(position);
    

    console.log('====== 进入 provideDefinition 方法 ======');
    console.log('fileName: ' + fileName); // 当前文件完整路径
    console.log('workDir: ' + workDir); // 当前文件所在目录
    console.log('word: ' + word); // 当前光标所在单词
    console.log('line: ' + line.text); // 当前光标所在行
    
    // 处理zk文件
    if (/\d{12}_.+/.test(fileName)){
        console.log(word, line.text)

        return workspace.findFiles(`${word}.md`).then(files => {
          console.log('files: ', files)
          let destPath = files[0].path
          console.log('destPath: ', destPath)
          return new vscode.Location(vscode.Uri.file(destPath), new vscode.Position(0, 0))
        })
    }

  }
}
