import * as vscode from "vscode";
import handleError from "../utils/handleError";
import Range from "../utils/Range";

type SentenceType =
  | "css"
  | "local"
  | "package"
  | "annotation"
  | "other"
  | "empty";
type SentenceDate = {
  range: vscode.Range;
  text: string;
};

/**
 *
 * @param editor
 * @returns
 */
function importFixer(editor: vscode.TextEditor) {
  const document = editor.document;
  const config = vscode.workspace.getConfiguration();
  const maxLinesNumber = document.lineCount - 1;

  // 需要替换的范围
  let replaceRange: Range | undefined = undefined;
  const imports: Record<
    Exclude<SentenceType, "other" | "empty">,
    SentenceDate[]
  > = {
    package: [],
    local: [],
    css: [],
    annotation: [],
  };

  // TODO 第一行的注释不要动
  try {
    let i = 0;
    while (i < Math.min(maxLinesNumber, 50)) {
      const line = document.lineAt(i);
      const info = getLineInfo(line, document);
      if (info.type === "other") {
        break;
      } else if (info.type !== "empty") {
        if (!replaceRange) {
          replaceRange = new Range(info.range);
        } else {
          replaceRange.update({
            endLine: info.range.end.line,
            endCharacter: info.range.end.character,
          });
        }
        const type = info.type;
        const importText = document.getText(info.range);
        if (type) {
          imports[type].push({
            range: info.range,
            text: importText,
          });
        }
      }
      i = info.range.end.line + 1;
    }

    let contents: string[] = [];
    Object.keys(imports).forEach((type) => {
      console.log(type);
      const sentences = imports[type as keyof typeof imports];
      if (!sentences.length) {
        return;
      }
      // TODO 换行符应该获取来自当前使用的换行符
      contents.push(
        sentences.map((sentence) => sentence.text).join("\n") + "\n"
      );
    });

    const contentsText = contents.join("\n");
    const oldtext = document.getText(replaceRange?.getOriginRange());
    if (oldtext === contentsText) {
      return;
    }

    editor.edit((editor) => {
      if (replaceRange) {
        editor.replace(replaceRange.getOriginRange(), contentsText);
      }
    });

    document.save();
  } catch (error: any) {
    handleError(error);
  }
}

function getLineInfo(line: vscode.TextLine, document: vscode.TextDocument) {
  console.log(line);
  if (line.isEmptyOrWhitespace) {
    return {
      type: "empty" as SentenceType,
      range: line.range,
    };
  }
  const text = line.text;
  let range: vscode.Range = line.range;
  let type: SentenceType | null = null;

  const isImport = /^@?import\s*/.test(text.trim());
  const isAnnotation = /^\/\/|\*/.test(text.trim());

  if (isImport) {
    type = getImportType(document, range.end.line);
    console.log("type", type);
    range = getImportRange(document, line.lineNumber);
  } else if (isAnnotation) {
    type = "annotation";
    range = getAnnotationRange(document, line.lineNumber);
  } else {
    type = "other";
  }

  return { type, range };
}

function getAnnotationRange(document: vscode.TextDocument, startLine: number) {
  const maxlinesNumber = document.lineCount - 1;
  const line = document.lineAt(startLine);
  const text = line.text;
  if (/^\/\*/.test(text)) {
    let endLine = startLine;
    while (endLine < Math.min(maxlinesNumber, 50)) {
      const currentLine = document.lineAt(endLine);
      const currentText = currentLine.text;
      if (/\*\//.test(currentText)) {
        // 匹配到注释结束
        const end = currentLine.range.end;
        return new Range(document.lineAt(startLine).range)
          .update({
            endLine: end.line,
            endCharacter: end.character,
          })
          .getOriginRange();
      }
      // 未匹配到注释 继续找下一行
      endLine++;
    }
  }
  return line.range;
}

function getImportRange(document: vscode.TextDocument, startLine: number) {
  const maxlinesNumber = document.lineCount - 1;
  const range = new Range(document.lineAt(startLine).range);

  let curLine = startLine;
  while (curLine < Math.min(maxlinesNumber, 50)) {
    const currentLine = document.lineAt(curLine);
    const currentText = currentLine.text;
    const matchs = currentText.match(/\'(.*)\'/);
    if (matchs) {
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
  return range.getOriginRange();
}

function getImportType(document: vscode.TextDocument, lineNumber: number) {
  const text = document.lineAt(lineNumber).text;
  const matchs = text.match(/\'(.*)\'/) || text.match(/\"(.*)\"/);
  if (matchs) {
    const path = matchs[1];
    const pathArr = path.split("/");
    const fileName = pathArr[pathArr.length - 1];
    const packageName = pathArr[0];
    console.log(packageName);

    if (/.(sa|sc|le|c)ss/.test(fileName)) {
      return "css";
    }
    if (/^\.|@/.test(packageName)) {
      return "local";
    }
    return "package";
  }
  return null;
}

export default importFixer;
