import * as vscode from "vscode";
import FileWatcher from "./core/FIleWatcher";

function subscribeCommands(context: vscode.ExtensionContext) {
  const autofix = vscode.commands.registerCommand("extension.fixImport", () => {
    const editor = vscode.window.activeTextEditor; // 每次运行选中文件
  });

  // 注册插件
  context.subscriptions.push(autofix);
}

export function activate(context: vscode.ExtensionContext) {
  new FileWatcher();
  subscribeCommands(context);
}

export function deactivate() {}
