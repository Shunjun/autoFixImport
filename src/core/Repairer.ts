import * as vscode from "vscode";

import { ImportType } from "../type";
import getConfig from "../utils/getConfig";
import getEol from "../utils/getEol";
import { clearIdPool } from "../utils/guid";
import { handleError } from "../utils/message";
import Range from "../utils/Range";
import Dependencies from "./Dependencies";
import { Sentence } from "./Sentence";

class Repairer {
  constructor(private editor: vscode.TextEditor) {}

  /**
   * 执行修复
   */
  fix() {
    const editor = this.editor;
    const document = editor.document;
    const fileLinesNumber = document.lineCount - 1;
    // 只有一行不做处理
    if (fileLinesNumber < 2) {
      return;
    }
    clearIdPool();
    // 获取当前 workspace 的依赖
    const dependencies = new Dependencies(this.getWorkSpacePath());
    const deps = dependencies.getDeps();

    try {
      const eol = getEol(editor);

      const sentences = this.getReplaceSentence();
      if (sentences.length === 0) {
        return;
      }

      const firstSentence = sentences[0];
      const lastSentence = sentences[sentences.length - 1];
      // 需要替换的范围
      const replaceRange = new Range({
        startLine: firstSentence.range.start.line,
        startCharacter: firstSentence.range.start.character,
        endLine: lastSentence.range.end.line,
        endCharacter: lastSentence.range.end.character,
      });

      const sortedSentence: Sentence[] = this.graphSentences(sentences);

      let contents: string[] = sortedSentence.map(
        (sentence) => sentence.sentenceText
      );
      // let tempSentence = sortedSentence[0];
      // sortedSentence.forEach((sentence) => {
      //   if (
      //     blank &&
      //     (sentence?.importType !== tempSentence?.importType ||
      //       sentence.type !== tempSentence.type)
      //   ) {
      //     contents.push("");
      //   }
      //   tempSentence = sentence;
      //   contents.push(sentence.sentenceText);
      // });

      const contentsText = contents.join(eol);
      const replaceText = document.getText(replaceRange.getOriginRange());

      if (contentsText !== replaceText) {
        editor.edit((editor) => {
          if (replaceRange) {
            editor.replace(replaceRange.getOriginRange(), contentsText);
          }
        });

        document.save();
      }
    } catch (error: any) {
      handleError(error);
    }
  }

  graphSentences(sentences: Sentence[]) {
    const { graph, removeAnnotation } = getConfig();
    const sortedSentence: Sentence[] = [];
    const sortedKeys = new Set();

    graph.forEach((gra) => {
      if (this.isGraphType(gra)) {
        const selected = sentences.filter((sentence) => {
          if (
            sentence.type === "import" &&
            sentence.importType === gra &&
            !sortedKeys.has(sentence.id)
          ) {
            sortedKeys.add(sentence.id);
            return true;
          } else {
            return false;
          }
        });
        sortedSentence.push(...this.sortSentences(selected));
      } else if (this.isRegExp(gra)) {
        const selected = sentences.filter((sentence) => {
          if (
            sentence.type === "import" &&
            new RegExp(gra.slice(1, -1)).test(sentence.path || "") &&
            !sortedKeys.has(sentence.id)
          ) {
            sortedKeys.add(sentence.id);
            return true;
          } else {
            return false;
          }
        });
        sortedSentence.push(...this.sortSentences(selected));
      } else if (gra === "") {
        sortedSentence.push(new Sentence(this.editor));
      }
    });

    if (!removeAnnotation) {
      sortedSentence.push(
        ...sentences.filter((sentence) => sentence.type === "annotation")
      );
    }

    return sortedSentence;
  }

  sortSentences(sentences: Sentence[]) {
    const { sort } = getConfig();

    sentences.sort((sentence1, sentence2) => {
      if (sentence1.type === "import" && sentence2.type === "import") {
        const code1 = this.getCharCodeSum(sentence1.path || "");
        const code2 = this.getCharCodeSum(sentence2.path || "");
        return sort === "asc" ? code1 - code2 : code2 - code1;
      }
      return 0;
    });

    return sentences;
  }

  getCharCodeSum(path: string) {
    const minCharCode = "a".charCodeAt(0);
    path = path.toLowerCase();
    return new Array(6).fill(1).reduce((sum, _, index) => {
      const code = path.charCodeAt(index);
      return sum + (isNaN(code) ? minCharCode : code);
    }, 0);
  }

  isGraphType(graph: string) {
    return ["external", "absolute", "relative", "style"].includes(graph);
  }

  isRegExp(graph: string) {
    return /^\/.+\/$/.test(graph);
  }

  /**
   * 获取当前文件的 workSpacePath
   */
  getWorkSpacePath() {
    const editor = this.editor;
    const documentUri = editor.document.uri;
    const rootDir = vscode.workspace.getWorkspaceFolder(documentUri);

    return rootDir?.uri.path || "";
  }

  /**
   * 获取从第一句 import 到最后一句 import 的所有语句
   * @param editor
   * @returns
   */
  getReplaceSentence() {
    const editor = this.editor;
    const fileLinesNumber = editor.document.lineCount - 1;
    let sentences: Sentence[] = [];
    const tempSentences: Sentence[] = [];

    let i = 0;
    while (i < Math.min(fileLinesNumber, 1000000)) {
      const sentence = new Sentence(editor, i);

      if (sentence.type === "other") {
        break;
      }

      if (sentence.type === "import") {
        if (tempSentences.length && sentences.length) {
          sentences = sentences.concat(tempSentences);
          tempSentences.length = 0;
        } else {
          tempSentences.length = 0;
        }
        sentences.push(sentence);
      } else {
        tempSentences.push(sentence);
      }

      i = sentence.range.end.line + 1;
    }
    return sentences;
  }
}

export default Repairer;
