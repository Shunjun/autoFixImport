import * as vscode from "vscode";
import { Config, ImportType } from "../type";

const defaultSort: ImportType[] = ["external", "absolute", "relative", "style"];

function getConfig(): Config {
  const config = vscode.workspace.getConfiguration("autoSortImport") as Config;

  const sort = config.sort.concat(
    defaultSort.filter((item) => !config.sort.includes(item))
  );

  return { ...config, sort };
}

export default getConfig;
