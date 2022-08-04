import * as vscode from "vscode";

import FileWatcher from "./core/FIleWatcher";
import Repairer from "./core/Repairer";

/**
 * 注册命令
 */
function subscribeCommands(context: vscode.ExtensionContext) {
  const autoFix = vscode.commands.registerCommand("extension.fixImport", () => {
    const editor = vscode.window.activeTextEditor; // 每次运行选中文件
    if (editor) {
      new Repairer(editor).fix();
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
