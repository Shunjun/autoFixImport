import * as vscode from "vscode";

import { SuffixType } from "../type";
import getConfig from "../utils/getConfig";
import { handleError } from "../utils/message";
import { throttle } from "../utils/throttle";
import Repairer from "./Repairer";

interface FileInfoType {
  fileName: string;
  lastTime: number;
}

class FileWatcher {
  // LRU 缓存, 保存最后修改过的文件
  lastFixFile: FileInfoType[] = [];

  repairer: Repairer;

  constructor() {
    const editor = vscode.window.activeTextEditor;
    this.repairer = new Repairer(editor!);

    vscode.workspace.onWillSaveTextDocument(this.startWatch.bind(this));
  }

  startWatch(e: vscode.TextDocumentWillSaveEvent) {
    const { suffix } = getConfig();
    const fileName = e.document?.fileName;
    const fileSuffix = fileName.split(".").pop() as SuffixType;
    if (!fileSuffix || !suffix.includes(fileSuffix)) {
      return;
    }
    try {
      const fileInfo = this.updateFileList(fileName);
      const editor = vscode.window.activeTextEditor;
      const lastItem = this.lastFixFile[this.lastFixFile.length - 1] || {};
      lastItem.lastTime = this.throttleFixer(fileInfo.lastTime, editor);
    } catch (error: any) {
      handleError(error);
    }
  }

  throttleFixer = throttle((editor?: vscode.TextEditor) => {
    if (editor) {
      this.repairer.fix();
    }
  });

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
