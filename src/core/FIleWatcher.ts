import * as vscode from "vscode";
import handleError from "../utils/handleError";
import { throttle } from "../utils/throttle";
import importFixer from "./importfixer";

interface FileInfoType {
  fileName: string;
  lastTime: number;
}

class FileWatcher {
  // LRU 缓存, 保存最后修改过的文件
  lastFixFile: FileInfoType[] = [];

  constructor() {
    vscode.workspace.onWillSaveTextDocument(this.startWatch.bind(this));
  }

  startWatch(e: vscode.TextDocumentWillSaveEvent) {
    if (e.document.isDirty) {
      return;
    }
    try {
      const fileName = e.document?.fileName;
      const fileInfo = this.updateFileList(fileName);
      const editor = vscode.window.activeTextEditor;

      const throttleFn = throttle(() => {
        if (editor) {
          importFixer(editor);
        }
      });
      const lastItem = this.lastFixFile[this.lastFixFile.length - 1];
      lastItem.lastTime = throttleFn(fileInfo.lastTime);
    } catch (error: any) {
      handleError(error);
    }
  }

  updateFileList(fileName: string) {
    const fileList = this.lastFixFile;
    const index = fileList.findIndex((item) => item.fileName === fileName);
    let fileInfo;
    if (index > -1) {
      fileInfo = fileList[index];
      this.lastFixFile.splice(index, 1);
    } else {
      if (fileList.length >= 10) {
        fileList.unshift();
      }
      fileInfo = {
        fileName,
        lastTime: 0,
      };
    }
    fileList.push(fileInfo);
    return fileInfo;
  }
}

export default FileWatcher;
