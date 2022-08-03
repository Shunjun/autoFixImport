import * as vscode from "vscode";

import FileWatcher from "./core/FIleWatcher";
import Repairer from "./core/Repairer";

/**
 * 注册命令
 */
function subscribeCommands(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor; // 每次运行选中文件
  if (!editor) {
    return;
  }
  const repairer = new Repairer(editor);

  const autoFix = vscode.commands.registerCommand("extension.fixImport", () => {
    if (editor) {
      repairer.fix();
    }
  });

  // 注册插件
  context.subscriptions.push(autoFix);
}

export function activate(context: vscode.ExtensionContext) {
  new FileWatcher();
  subscribeCommands(context);
}

export function deactivate() {}
