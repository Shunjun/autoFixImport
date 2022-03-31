import * as vscode from "vscode";
import { ImportType } from "../type";
import getConfig from "../utils/getConfig";
import getEol from "../utils/getEol";
import handleError from "../utils/handleError";
import Range from "../utils/Range";
import { Sentence } from "./Sentence";

/**
 *
 * @param editor
 * @returns
 */
function fixer(editor: vscode.TextEditor) {
  const document = editor.document;
  const fileLinesNumber = document.lineCount - 1;
  if (fileLinesNumber < 2) {
    return;
  }
  const { sort, removeAnnotation, blank } = getConfig();
  try {
    const eol = getEol(editor);

    const sentences = getReplaceSentence(editor);
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

    const sortedSentence: Sentence[] = [];
    sort.forEach((type: ImportType) => {
      sortedSentence.push(
        ...sentences.filter(
          (sentence) =>
            sentence.type === "import" && sentence.importType === type
        )
      );
    });

    if (!removeAnnotation) {
      sortedSentence.push(
        ...sentences.filter((sentence) => sentence.type === "annotation")
      );
    }

    let contents: string[] = [];
    let tempSentence = sortedSentence[0];
    sortedSentence.forEach((sentence) => {
      if (
        blank &&
        (sentence?.importType !== tempSentence?.importType ||
          sentence.type !== tempSentence.type)
      ) {
        contents.push("");
      }
      tempSentence = sentence;
      contents.push(sentence.sentenceText);
    });

    console.log(contents);

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

/**
 * 获取从第一句 import 到最后一句 import 的所有语句
 * @param editor
 * @returns
 */
function getReplaceSentence(editor: vscode.TextEditor) {
  const fileLinesNumber = editor.document.lineCount - 1;
  let sentences: Sentence[] = [];
  const tempSentences: Sentence[] = [];

  let i = 0;
  while (i < Math.min(fileLinesNumber, 50)) {
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

export default fixer;
