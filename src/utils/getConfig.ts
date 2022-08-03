import * as vscode from "vscode";

import { Config, GraphType } from "../type";

const defaultGraph: GraphType[] = [
  "external",
  "",
  "absolute",
  "relative",
  "",
  "style",
];

/**
 * 获取用户配置
 * @returns
 */
function getConfig(): Config {
  const config = vscode.workspace.getConfiguration("autoSortImport") as Config;

  // const sort = config.sort.concat(
  //   defaultSort.filter((item) => !config.sort.includes(item))
  // );
  const sort = config.sort ?? "off";
  const graph = config.graphs ?? defaultGraph;

  return { ...config, sort, graph };
}

export default getConfig;
