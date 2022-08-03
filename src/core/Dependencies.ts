/**
 * @author        Shunzi <toby.zsj@gmail.com>
 * @date          2022-08-02 20:03:57
 */

import * as fs from "fs";
import * as path from "path";

class Dependencies {
  private workspaceRoot: string;

  /** 当前已解析的模块名, 防止重复解析 */
  private resolvedPackageNameSet: Set<string>;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.resolvedPackageNameSet = new Set<string>();
  }

  /**
   * 获取项目中所有依赖
   * @returns
   */
  getDeps() {
    const rootPackageJsonPath = this.getPackageJsonPathIn(this.workspaceRoot);
    if (!rootPackageJsonPath) {
      return [];
    }
    const rootDepsKeys = this.getMergedDepsInPackageJson(rootPackageJsonPath);

    const allDepsKeys = (
      this.maybeUseNodeModules(rootDepsKeys) || this.maybeUsePnp(rootDepsKeys)
    ).concat(rootDepsKeys);

    return [...new Set(allDepsKeys).values()];
  }

  /**
   * 可能使用 Node_module 管理依赖
   */
  maybeUseNodeModules(rootDeps: string[]) {
    if (
      rootDeps.every((packageName) => {
        return this.pathExists(this.getPackageRootInNodeModules(packageName));
      })
    ) {
      this.resolvedPackageNameSet.clear();
      return rootDeps.flatMap((packageName) => {
        if (this.resolvedPackageNameSet.has(packageName)) {
          return [];
        } else {
          this.resolvedPackageNameSet.add(packageName);
          const packageRoot = this.getPackageRootInNodeModules(packageName);
          return this.getChildren(packageRoot);
        }
      });
    }
    return null;
  }

  /**
   * 可能使用 pnp 管理依赖
   */
  maybeUsePnp(rootDeps: string[]) {
    // TODO
    return [];
  }

  /**
   *
   */
  getDepsInPnp() {
    // TODO 获取 pnp 中的依赖
  }

  getChildren(packageRoot: string): string[] {
    const packageJsonPath = this.getPackageJsonPathIn(packageRoot);
    const allDepsKeys = this.getMergedDepsInPackageJson(packageJsonPath);

    const childrenDeps = allDepsKeys.flatMap((packageName: string) => {
      if (this.resolvedPackageNameSet.has(packageName)) {
        return [];
      } else {
        this.resolvedPackageNameSet.add(packageName);
        const packageRoot = this.getPackageRootInNodeModules(packageName);
        return this.getChildren(packageRoot);
      }
    });

    return allDepsKeys.concat(childrenDeps);
  }

  /**
   * 合并返回 packageJson 中的依赖
   * @param packageJsonPath
   */
  getMergedDepsInPackageJson(packageJsonPath: string) {
    const { depsKeys, devDepsKeys } =
      this.getDepsInPackageJson(packageJsonPath);
    return depsKeys.concat(devDepsKeys);
  }

  /**
   * 获取 packageJson 中的依赖
   * @param packageJsonPath
   */
  getDepsInPackageJson(packageJsonPath: string) {
    if (packageJsonPath === null || !this.pathExists(packageJsonPath)) {
      return { depsKeys: [], devDepsKeys: [] };
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    const depsKeys = packageJson.dependencies
      ? Object.keys(packageJson.dependencies)
      : [];

    const devDepsKeys = packageJson.devDependencies
      ? Object.keys(packageJson.devDependencies)
      : [];

    return { depsKeys, devDepsKeys };
  }

  private getPackageJsonPathIn(packageRoot: string) {
    return path.resolve(packageRoot, "package.json");
  }

  private getPackageRootInNodeModules(packageName: string) {
    return path.resolve(this.workspaceRoot, "node_modules", packageName);
  }

  private pathExists(path: string): boolean {
    try {
      fs.accessSync(path);
    } catch (err) {
      return false;
    }

    return true;
  }
}

export default Dependencies;
