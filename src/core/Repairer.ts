import * as vscode from "vscode";
import * as p from "perf_hooks";
import { ImportType } from "../type";
import getConfig from "../utils/getConfig";
import getEol from "../utils/getEol";
import { clearIdPool } from "../utils/guid";
import { handleError } from "../utils/message";
import Range from "../utils/Range";
import Dependencies from "./Dependencies";
import { Sentence } from "./Sentence";

class Repairer {
  sortedKeys = new Set<string>();

  constructor(private editor: vscode.TextEditor) {}

  initFix() {
    clearIdPool();
    this.sortedKeys.clear();
  }

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
    this.initFix();

    try {
      const eol = getEol(editor);

      const sentences = this.getReplaceSentence();
      if (sentences.length === 0) {
        return;
      }

      // 需要替换的范围
      const replaceRange = this.getReplaceRange(sentences);
      // 排序
      const sortedSentence: Sentence[] = this.graphSentences(sentences);

      let contents: string[] = sortedSentence.map(
        (sentence) => sentence.sentenceText
      );

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

  getReplaceRange(sentences: Sentence[]) {
    const firstSentence = sentences[0];
    const lastSentence = sentences[sentences.length - 1];
    // 需要替换的范围
    return new Range({
      startLine: firstSentence.range.start.line,
      startCharacter: firstSentence.range.start.character,
      endLine: lastSentence.range.end.line,
      endCharacter: lastSentence.range.end.character,
    });
  }

  graphSentences(sentences: Sentence[]) {
    const { graph, removeAnnotation } = getConfig();
    const sortedSentence: Sentence[] = [];

    graph.forEach((gra) => {
      const graphKind = this.getGraphKind(gra);

      if (["graphType", "regexp"].includes(graphKind)) {
        const selected = sentences.filter(
          this.generateFilter(gra, graphKind as "graphType" | "regexp")
        );
        sortedSentence.push(...this.sortSentences(selected));
      } else if (
        graphKind === "empty" &&
        sortedSentence.length &&
        !this.lastIsEmpty(sortedSentence)
      ) {
        sortedSentence.push(new Sentence(this.editor));
      }
    });

    // 处理未包含的 import
    sortedSentence.push(
      ...sentences.filter(
        (sentence) =>
          sentence.type === "import" && !this.sortedKeys.has(sentence.id)
      )
    );

    // 弹出多余的空行
    if (this.lastIsEmpty(sortedSentence) && graph[graph.length - 1] !== "") {
      sortedSentence.pop();
    }

    const annotationSentences = sentences.filter(
      (sentence) => sentence.type === "annotation"
    );
    if (!removeAnnotation && annotationSentences.length) {
      if (!this.lastIsEmpty(sortedSentence)) {
        sortedSentence.push(new Sentence(this.editor));
      }
      sortedSentence.push(...annotationSentences);
    }

    return sortedSentence;
  }

  lastIsEmpty(sentences: Sentence[]) {
    return sentences[sentences.length - 1].type === "empty";
  }

  sortSentences(sentences: Sentence[]) {
    const { sort } = getConfig();

    if (sort === "off" || !sort) {
      return sentences;
    }

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

  /**
   * 过滤方法
   * @param graph
   * @param type
   * @returns
   */
  generateFilter(graph: string, type: "graphType" | "regexp") {
    return (sentence: Sentence) => {
      if (
        sentence.type === "import" &&
        !this.sortedKeys.has(sentence.id) &&
        (type === "graphType"
          ? sentence.importType === graph
          : new RegExp(graph.slice(1, -1)).test(sentence.path || ""))
      ) {
        this.sortedKeys.add(sentence.id);
        return true;
      } else {
        return false;
      }
    };
  }

  getCharCodeSum(path: string) {
    const minCharCode = "a".charCodeAt(0);
    path = path.toLowerCase();
    return new Array(6).fill(1).reduce((sum, _, index) => {
      const code = path.charCodeAt(index);
      return sum + (isNaN(code) ? minCharCode : code);
    }, 0);
  }

  getGraphKind(graph: string) {
    if (this.isGraphType(graph)) {
      return "graphType";
    } else if (this.isRegExp(graph)) {
      return "regexp";
    } else if (graph === "") {
      return "empty";
    }
    return "error";
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

    // 获取当前 workspace 的依赖
    const start = p.performance.now();
    const dependencies = new Dependencies(this.getWorkSpacePath());
    const deps = dependencies.getDeps();
    console.log(p.performance.now() - start);

    let i = 0;
    while (i < fileLinesNumber) {
      const sentence = new Sentence(editor, i, deps);

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
