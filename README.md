# Junyao Huang · 黄俊尧

用于 GitHub Pages 的中英文学术个人主页。纯 HTML、CSS 和 JavaScript，无需安装依赖或构建。

## 本地查看

双击 `index.html` 即可浏览公开主页。管理页需要通过网站访问：在本目录运行 `python -m http.server 8000`，然后打开 `http://localhost:8000/admin/`。管理页连接真实 GitHub 后的发布会修改线上仓库。

默认英文，右上角切换中文并记住选择；用 `?lang=zh` 或 `?lang=en` 可指定首次进入时的语言。

## 发布到 GitHub Pages

目标账号：**Mowans**。个人主页仓库名称为 **Mowans.github.io**，网站地址为 [mowans.github.io](https://mowans.github.io/)。

1. 登录 GitHub，新建公开仓库 `Mowans.github.io`。
2. 将本文件夹中的 `index.html`、`styles.css`、`script.js`、`assets/`、`admin/`、`content/` 和 `.nojekyll` 上传到仓库根目录并提交到 `main` 分支。不要把整个文件夹作为额外的一层上传。
3. 在仓库 **Settings → Pages → Build and deployment** 下，选择 **Deploy from a branch**，选择 **main** 和 **/(root)**，保存。
4. 等待 Pages 部署完成，再访问上述主页地址。发布完成的地址会显示在 Pages 设置页。

参考：[GitHub 官方发布指南](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) · [配置发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 内容维护

日常更新请打开 **[主页管理](https://mowans.github.io/admin/)**，也可从主页底部进入。不需要安装软件或修改代码。

### 首次连接

1. 点击 **连接 GitHub**，再点击弹窗中的 **在 GitHub 创建访问令牌**，使用 `Mowans` 账号。
2. 在 **Repository access** 选择 **Only select repositories**，仅选择 `Mowans.github.io`。
3. 设置仓库权限 **Contents → Read and write**，生成细粒度令牌。其他写入权限不需要；链接默认建议 30 天有效期，可按需调整。
4. 将令牌粘贴到管理页的密码框，点击 **连接并载入内容**。不要把令牌写入任何项目文字、草稿文件或聊天。

令牌只在当前页面内存中使用，刷新或关闭后需要重新粘贴；文字草稿不包含令牌。令牌到期后需重新生成。创建权限说明见 [GitHub 官方指南](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)。管理页本身可以公开访问，只有连接 `Mowans` 账号并拥有该仓库写入权限的人才能发布。

### 三种日常更新

| 更新内容 | 操作 |
| --- | --- |
| 论文状态 | 选择项目，在 **论文 / 项目状态** 中选择审稿中、已录用、已发表等。标准状态自动同步中英文；自定义状态可分别填写。 |
| 添加项目 | 点击列表旁的 **＋**，填写标题和简介，按需补充分类、时间、指标、方法及链接。英文内容在 **英文内容与更多设置** 中填写，留空时使用中文。 |
| 替换简历 | 打开 **简历文件**，选择不超过 10 MB 的 PDF。发布后会替换下载文件，并更新下载链接。简历内容不会自动导入到项目表单。 |

修改后点击 **预览主页** 检查中文和英文，再点击 **发布更改 → 确认发布**。网页内容和简历在同一次提交中保存。页面先显示已提交到 GitHub，等网站更新后显示已上线；也可通过发布进度链接查看 GitHub Pages 的状态。

可用 **上移 / 下移** 排序，取消 **在主页展示** 可隐藏项目，**移除项目** 会在发布后从主页中移除。发布前，线上内容不会变化。

### 草稿与恢复

- 文字草稿自动保存在当前浏览器；下次打开时选择 **恢复草稿** 或 **使用线上内容**。关闭浏览器不会发布草稿。
- **导出草稿 / 导入草稿** 用于文字备份或更换设备。导出文件不含令牌，也不含 PDF。
- 尚未发布的 PDF 只在当前页面暂存；刷新后需要重新选择文件。
- 如果仓库在编辑期间发生变化，管理页会停止发布以避免覆盖。先导出草稿，再 **载入最新内容** 并核对需要的更改。
- 如果网络中断使发布结果不确定，点击 **核对发布结果**，不要重复提交；重新连接后也会核对。
- 每次成功发布都有 GitHub 提交历史。需要撤销已发布内容时，可以在仓库中恢复相应提交，或让维护者帮助恢复。

### 文件说明（供维护者使用）

- `content/site.json`：研究项目、论文状态和简历元信息的编辑来源。
- `admin/`：管理页、内容校验与静态网页生成、GitHub 发布连接。不包含访问令牌。
- `index.html`：公开主页；研究区域由管理页生成，其余介绍、实习、教育、技能和联系方式保留手工维护。
- `styles.css`：布局、颜色、移动端和打印样式。
- `script.js`：语言切换、研究筛选、移动端导航。
- `assets/*.svg`：可编辑的概念示意图，不是实验数据图。
- `assets/Junyao_Huang_CV.pdf`：用户提供的原始中文简历副本。**包含手机号和邮箱**，下载按钮会公开提供整份 PDF；若不希望公开手机号，请在发布前替换为公开版简历。

管理页将研究内容同步生成到 `index.html`，公开主页无须依赖 JavaScript 才能显示研究。不要手工删除 `<!-- cms:… -->` 标记，也不要只编辑生成后的研究 HTML；否则下一次管理页发布可能覆盖该研究区域。个人介绍等其他区域的中英文内容分别置于 `lang="en"` 和 `lang="zh-CN"` 元素中，修改时需同步对应译文。页面不依赖第三方字体、脚本、分析服务或网络图片。

研究状态与指标来自提供的简历，记录日期为 2026 年 11 月。未提供论文正式英文题名、论文链接、完整作者列表或项目视频，因此主页使用研究主题标题，不虚构论文链接、录用状态或作者信息。仿真结果与实机条件分别标注。

## GitHub 账号资料页（可选）

本项目是独立的 GitHub Pages 网站。若还希望在 `github.com/Mowans` 的账号页展示个人简介，可新建同名公开仓库 `Mowans`，将 `GITHUB_PROFILE_README.md` 的内容复制到该仓库的 `README.md`。它不会自动修改账号资料页。
