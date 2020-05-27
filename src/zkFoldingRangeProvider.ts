const vscode = require('vscode');
const path = require('path');

import {FoldingRangeProvider, ProviderResult, FoldingRange, DefinitionLink, workspace} from 'vscode'

export const zkFoldingRangeProvider: FoldingRangeProvider= {
  provideFoldingRanges(document, context, token): ProviderResult<FoldingRange[]> {

    // 注入对应内容后折叠

    return [new FoldingRange(0, 3)]
  }
}