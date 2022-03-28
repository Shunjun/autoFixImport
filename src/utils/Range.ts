import * as vscode from "vscode";

type RangeData = {
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
};

class Range {
  private range: vscode.Range;
  constructor(obj: vscode.Range | RangeData) {
    if ("startLine" in obj) {
      this.range = new vscode.Range(
        obj.endLine,
        obj.startCharacter,
        obj.endLine,
        obj.endCharacter
      );
    } else {
      this.range = obj;
    }
  }

  update(obj: Partial<RangeData>) {
    const { startLine, startCharacter, endLine, endCharacter } = obj;

    this.range = new vscode.Range(
      startLine || this.range.start.line,
      startCharacter || this.range.start.character,
      endLine || this.range.end.line,
      endCharacter || this.range.end.character
    );

    return this;
  }

  getOriginRange() {
    return this.range;
  }
}

export default Range;
