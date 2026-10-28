# dsh-good-pet

> **作者**：lappo1234 与 **溯**  
> 上游：PC2005-cloud/dsh-pet（MIT）

基于 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)（MIT）的改造版。

原包是「桌宠本体」：能漫游、拖拽、抛掷、点播 106 个动画、显示余额、碎碎念。
这个版本在它上面加了一条**双向会话桥**和一套**拟人行为**，让桌宠成为某个 DSH 会话的前端。

> 上游版权归原作者所有，LICENSE 原样保留。本仓库只包含改动与打包产物，供个人使用。

---

## 一、加了什么

### 1. 会话桥（核心）

桌宠的「对话」输入框不再调用独立的碎碎念模型，而是把话**投进一个真实的 DSH 会话**：

```
桌宠输入 → POST /chat → relayToSession()
        → agents.get(sessionId).followup(userMessage)
        → whenIdle() 等这一轮跑完
        → 取最后一条 assistant/message 的 text
        → 写回 memory.json + 气泡
```

- 目标会话 id 存在 `~/.dsh/dsh-pet/chat-session.txt`（单行）；
- 会话不存在（冷）时，先 `agents.resume()` 叫醒，**并带上默认模型**（`agentDefaultModel.currentSelection()`），否则提示词模板里的 `{{model}}` 为空会导致整轮失败；
- 宿主侧新增路由：`GET /dsh-pet-7340/sessions`、`POST /dsh-pet-7340/session`。

### 2. 右键「选择会话」

- 列出**活会话 + 磁盘上的历史会话**（扫 `~/.dsh/sessions/` 逐个解 zstd 帧，取第一条用户消息当标题）；
- 按**工作区分组**，组按最新时间排序，组内按新旧排；
- 点一条即切换绑定，下一次对话生效。

### 3. 气泡

- **默认展开全文**，不再先给摘要；
- 长文按「气泡底边到窗口顶还剩多少」算高度，**滚动在圆角内侧**（外壳 `overflow:hidden` 保圆角，内层滚动）；
- 宽度上限 640px；
- **代码块渲染成灰底块，右上角「复制」**只复制那一段；底部「复制」复制全文（原样 Markdown）；展开态文字可选中；
- 右下角「×」关闭气泡；每次写气泡 10 分钟后自动消失；
- 修复：滚动区高度要扣掉 padding 与按钮行，否则气泡顶出窗口、留白被裁。

### 4. 聊天输入框

- 宽度：最短 160px，随文字变宽，上限 **680px**；
- **拖文件进输入框**：取本机路径，插入 `[附件] <path>`；
- **Ctrl+V 粘贴截图/文件**：图片经主进程写入 `%TEMP%\dsh-pet-clip\`，同样插入路径；
- 消息仍然是纯文本 + 路径，由会话里的 agent 自己读文件。

### 5. 拟人行为（参考 VPet 的结构）

- **状态机**：`normal | sleep`。闲置 3 分钟（可调 `sleepAfterMs`）进入睡眠，播「原地小憩沉眠」循环；任何交互 → 「打瞌睡被惊醒」；
- **分区点击**：上部=头（害羞/挠痒笑）、中部=身体（原 5 个点击回应）、下部=尾巴（尾巴拍地/傲娇）；
- **视线跟随**：光标到她另一侧且闲着时，5 秒内最多转一次头（播「东张西望」，朝向自动翻）；
- **体力/心情**：体力醒着 −0.5/分、睡着 +2/分，≤15 自己找地方睡；心情被摸 +3、久不理 −0.4/分；体力低偶尔打哈欠、心情高偶尔跳舞。**只存内存，不写盘**；
- **工作身体语言**：把 `workStatusTexts` 全清空（只留动画、不弹气泡），我这一轮跑的时候她播思考/忙碌/完成/出错的动作；干活时不睡。

### 6. 思考过程实时显示

- 宿主每 0.9s 扫一次会话事件里的 `reasoning` 块，写进 `pets.<id>.think`；
- 桌宠在头顶显示一个淡灰小气泡「思考：…」，回答出来时清除；
- 注意：事件是**每步完成后的整段推理**，所以是「一跳一跳」而不是逐字流。

---

## 二、改了哪些文件

| 文件 | 改动 |
|---|---|
| `lib/index.js` | 会话桥、`/sessions` `/session` 路由、冷会话 resume（带模型）、思考流、气泡截断/全文 |
| `runtime/electron-helper/sprite.js` | 气泡渲染（展开/圆角滚动/代码块/复制/×）、状态机、分区点击、视线、体力心情、`showThink` |
| `runtime/electron-helper/events.js` | `think` 叶子分发、默认展开、气泡时长与关闭 |
| `runtime/electron-helper/shared-core.js` | 聊天框拖拽、Ctrl+V 粘贴、输入框宽度上限 |
| `runtime/electron-helper/preload.js` | `getPathForFile`、`saveTempFile`、`copyText`、`getSessions` |
| `runtime/electron-helper/main.js` | 对应 IPC：写临时文件、写剪贴板、代取 /sessions |
| `assets/config.jsonc` | `workStatusTexts` 清空（只留动画） |

---

## 三、怎么装

把本目录整个替换进 DSH 的 profile 插件目录：

```
~/.dsh/profiles/desktop/node_modules/dsh-pet/
```

然后重启 DSH（宿主与桌面 helper 的代码只在启动时加载）。

---

## 四、已知限制

- 思考过程不是逐字流（见上）；
- 冷会话恢复只带模型，未装完整 preset，工具集可能不全；
- 代码块只有底色与等宽字体，**没有语法高亮**；
- 体力/心情不落盘，重启归零。
