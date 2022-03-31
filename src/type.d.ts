import { WorkspaceConfiguration } from "vscode";

declare type ImportType = "external" | "absolute" | "relative" | "style";

declare type SentenceType = "import" | "annotation" | "empty" | "other";

declare type AnnotationType = "single" | "multiLine";

declare type SuffixType = "js" | "mjs" | "jsx" | "ts" | "tsx";

declare interface Config extends WorkspaceConfiguration {
  /**
   * 是否使用空行分隔
   */
  blank: boolean;

  /**
   * 排序额顺序
   */
  sort: ("external" | "absolute" | "relative" | "style")[];

  /**
   * 移除 import 部分的注释行
   */
  removeAnnotation: boolean;

  /**
   * 启用排序功能的文件后缀
   */
  suffix: SuffixType[];
}
