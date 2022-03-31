import * as vscode from "vscode";
import { AnnotationType, ImportType, SentenceType } from "../type";
import Range from "../utils/Range";

const endRegExpMap = {
  import: /(\'.*\')|(\".*\")/,
  annotation: /\*\//,
};

export class Sentence {
  type: SentenceType;
  editor: vscode.TextEditor;
  startLine: number;
  sentenceText: string;
  range: vscode.Range;

  importType?: ImportType;
  path?: string;

  annotationType?: AnnotationType;

  constructor(editor: vscode.TextEditor, startLine: number) {
    this.editor = editor;
    this.startLine = startLine;
    this.type = this.getSentenceType(editor, startLine);
    this.sentenceText = editor.document.lineAt(startLine).text;
    this.range = editor.document.lineAt(startLine).range;

    if (this.type === "import") {
      const { text, range } = this.analyses();
      this.sentenceText = text;
      this.range = range;
      const lastLineText = this.editor.document.lineAt(
        this.range.end.line
      ).text;
      this.path = this.getImportPath(lastLineText);
      this.importType = this.getImportType(this.path);
    }

    if (this.type === "annotation") {
      this.annotationType = this.getAnnotationType(this.sentenceText);
      if (this.annotationType === "multiLine") {
        const { text, range } = this.analyses();
        this.sentenceText = text;
        this.range = range;
      }
    }
  }

  /**
   * 分析多行文本类型 import/annotation 的文本和范围
   * @returns
   */
  private analyses() {
    const document = this.editor.document;
    const fileLinesNumber = document.lineCount - 1;
    const range = new Range(document.lineAt(this.startLine).range);
    const text = document.lineAt(this.startLine).text;

    if (this.type === "empty" || this.type === "other") {
      return { range: range.getOriginRange(), text };
    }

    const endRegExp = endRegExpMap[this.type];

    let curLine = this.startLine;
    while (curLine < Math.min(fileLinesNumber, 50)) {
      const currentLine = document.lineAt(curLine);
      const currentText = currentLine.text;
      const matches = currentText.match(endRegExp);
      if (matches) {
        // 匹配到路径结束
        const end = currentLine.range.end;
        range.update({
          endLine: end.line,
          endCharacter: end.character,
        });
        break;
      }
      // 未匹配到路径 继续找下一行
      curLine++;
    }
    return {
      range: range.getOriginRange(),
      text: document.getText(range.getOriginRange()),
    };
  }

  /**
   * 获取语句的类型
   * @param editor
   * @param startLine
   * @returns
   */
  private getSentenceType(
    editor: vscode.TextEditor,
    startLine: number
  ): SentenceType {
    const line = editor.document.lineAt(startLine);
    const text = line.text;

    if (line.isEmptyOrWhitespace) {
      return "empty";
    }
    if (/^@?import\s*/.test(text.trim())) {
      return "import";
    }
    if (/^\/\/|\*/.test(text.trim())) {
      return "annotation";
    }
    return "other";
  }

  private getImportPath(lastLineText: string) {
    const path =
      lastLineText.match(/\'(.*)\'/)?.[1] ||
      lastLineText.match(/\"(.*)\"/)?.[1] ||
      "";
    return path;
  }

  /**
   * 获取 import 的类型
   * @param path
   * @returns ImportType
   */
  private getImportType(path: string): ImportType {
    const pathArr = path.split("/");
    const fileName = pathArr[pathArr.length - 1];

    if (/.(sa|sc|le|c)ss/.test(fileName)) {
      return "style";
    }
    if (/^\/|@/.test(path)) {
      return "absolute";
    }
    if (/^\./.test(path)) {
      return "relative";
    }
    return "external";
  }

  /**
   * 获取 annotation 的类型
   * @returns AnnotationType
   */
  private getAnnotationType(text: string): AnnotationType {
    if (text.startsWith("//")) {
      return "single";
    } else {
      return "multiLine";
    }
  }
}
