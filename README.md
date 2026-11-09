# Junyao Huang · 黄俊尧

用于 GitHub Pages 的中英文学术个人主页。纯 HTML、CSS 和 JavaScript，无需安装依赖或构建。

## 本地查看

双击 `index.html` 即可浏览。也可以在本目录运行 `python -m http.server 8000`，然后打开 `http://localhost:8000`。

默认英文，右上角切换中文并记住选择；用 `?lang=zh` 或 `?lang=en` 可指定首次进入时的语言。

## 发布到 GitHub Pages

目标账号：**Mowans**。个人主页仓库名称应为 **Mowans.github.io**，发布后地址为 **https://mowans.github.io/**。

1. 登录 GitHub，新建公开仓库 `Mowans.github.io`。
2. 将本文件夹中的 `index.html`、`styles.css`、`script.js`、`assets/` 和 `.nojekyll` 上传到仓库根目录并提交到 `main` 分支。不要把整个文件夹作为额外的一层上传。
3. 在仓库 **Settings → Pages → Build and deployment** 下，选择 **Deploy from a branch**，选择 **main** 和 **/(root)**，保存。
4. 等待 Pages 部署完成，再访问上述主页地址。发布完成的地址会显示在 Pages 设置页。

参考：[GitHub 官方发布指南](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) · [配置发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 内容维护

- `index.html`：个人介绍、研究、实习、教育、技能和联系方式。
- `styles.css`：布局、颜色、移动端和打印样式。
- `script.js`：语言切换、研究筛选、移动端导航。
- `assets/*.svg`：可编辑的概念示意图，不是实验数据图。
- `assets/Junyao_Huang_CV.pdf`：用户提供的原始中文简历副本。**包含手机号和邮箱**，下载按钮会公开提供整份 PDF；若不希望公开手机号，请在发布前替换为公开版简历。

中英文内容分别置于 `lang="en"` 和 `lang="zh-CN"` 元素中。更新一处内容时，请同步更新对应译文。页面不依赖第三方字体、脚本、分析服务或网络图片。

研究状态与指标来自提供的简历，记录日期为 2026 年 11 月。未提供论文正式英文题名、论文链接、完整作者列表或项目视频，因此主页使用研究主题标题，不虚构论文链接、录用状态或作者信息。仿真结果与实机条件分别标注。

## GitHub 账号资料页（可选）

本项目是独立的 GitHub Pages 网站。若还希望在 `github.com/Mowans` 的账号页展示个人简介，可新建同名公开仓库 `Mowans`，将 `GITHUB_PROFILE_README.md` 的内容复制到该仓库的 `README.md`。它不会自动修改账号资料页。
