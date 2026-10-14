# Excel Matrix Pro - Windows 桌面版批量处理工作台

现代化 Windows 11 Fluent 风格的 Excel 批量拆分、质量分汇总、CRA 量表横表/竖表智能合并与自动化处理系统。

---

## 🌟 核心功能

1. **PM 质量分拆分 (`/process`)**：
   - 提取指定列（默认 `4, 5, 6, 9, 11`），按最后一列分组拆分为多个独立 Excel；
   - 内部套用模板样式（Sheet `A`），从第 4 行开始写入并复制样式，打包为 ZIP 下载。
2. **PM 质量分合并 (`/merge`)**：
   - 扫描压缩包或批量多选文件中的 `HS` 开头工作表，剔除前 3 行与首列序号，纵向堆叠合并为 `merged.xlsx`。
3. **CRA 量表横表合并 (`/merge_cra`)**：
   - 读取《CRA填写表单》首行基础信息；依据《填写指南》标准排序与别名映射；依据《分数目录》改写肿瘤/非肿瘤分值等级；横向展开输出大宽表 `merged_cra.xlsx`。
4. **CRA 量表竖表合并 (`/merge_cra_vertical`)**：
   - 保留首行固定信息，从第 3 行逐行过滤次数为 0 的空行，改写分值等级并纵向堆叠为流水明细表 `merged_cra_vertical.xlsx`。

---

## 🤖 GitHub Actions 自动化工作流 (CI/CD)

本项目配置了两个开箱即用的 GitHub Actions 工作流：

| 工作流文件 | 运行平台 | 生成产物 | 说明 |
| :--- | :--- | :--- | :--- |
| **`.github/workflows/build-html.yml`** | `ubuntu-latest` | `ExcelMatrixPro_离线单文件版.html` | 一键生成单文件离线 HTML，在任何电脑双击浏览器直接使用 |
| **`.github/workflows/build-exe.yml`** | `windows-latest` | `ExcelMatrixPro.exe` | 使用 PyInstaller 自动化编译为 **Windows 免安装独立单文件 .exe** |

### 🚀 如何推送到您自己的 GitHub 仓库？

在本地终端或项目根目录下执行以下命令即可推送到 GitHub：

```bash
# 1. 添加您的远程仓库地址 (请将 <USERNAME> 和 <REPO> 替换为您的 GitHub 用户名和仓库名)
git remote add origin https://github.com/<USERNAME>/<REPO>.git

# 2. 确认主分支为 main
git branch -M main

# 3. 推送代码到 GitHub
git push -u origin main
```

推送成功后：
- 进入 GitHub 仓库页面的 **Actions** 选项卡；
- 您将看到两个工作流自动触发运行；
- 构建完成后，可在 **Artifacts (构建产物)** 区域直接下载 **`ExcelMatrixPro-Windows-Portable-EXE`** (`.exe`) 和 **`ExcelMatrixPro-Offline-HTML`** (`.html`)！
- 当您在 GitHub 上发布 Release (标签) 时，`.exe` 与 `.html` 会自动附加在 Release 资产列表中供用户直接下载！

---

## 💻 本地运行与开发

```bash
# 1. 安装前端依赖
npm install

# 2. 启动前端现代化 Windows 风格开发服务器
npm run dev

# 3. 构建前端产物
npm run build
```

如需本地直接测试 Python 原生 GUI 桌面程序：
```bash
pip install pandas openpyxl xlsxwriter py7zr
python desktop_app.py
```
