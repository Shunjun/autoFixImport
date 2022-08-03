import * as vscode from "vscode";

export function handleError(error: Error) {
  vscode.window.showErrorMessage(error.message, error.toString());
}

export function handleInformation(message: string) {
  vscode.window.showInformationMessage(message);
}
