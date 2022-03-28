import * as vscode from "vscode";

function handleError(error: Error) {
  vscode.window.showErrorMessage(error.message, error.toString());
}

export default handleError;
