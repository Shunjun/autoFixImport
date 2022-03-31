# AutoSortImport

自动排序 Js、Ts 文件中的 import 导入

### 构建插件
```
npm run build
or
yarn build
```

### 配置项

- autoSortImport.blank `boolean` (default: true)
  使用空行分隔不同类型的import
- autoSortImport.sort `array` (default: ['external','absolute','relative','style'])
  Import 排序规则
  external 第三方库
  absolute 绝对路径
  relative 相对路径
  style 样式文件
- autoSortImport.removeAnnotation `boolean` (default: false)
  移除 Import 块内的注释
- autoSortImport.suffix `array` (default: ['js','mjs','jsx','ts','tsx'])
  启用的文件类型