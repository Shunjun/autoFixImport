import * as vscode from "vscode";

/**
 * 获取文件换行符
 * @param editor
 * @returns
 */
function getEol(editor: vscode.TextEditor) {
  const testText = editor.document.getText(new vscode.Range(0, 0, 1, 0));
  return testText[testText.length - 1];
}

export default getEol;
