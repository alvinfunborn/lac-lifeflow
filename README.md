# LaC.LifeFlow 插件

Life as Code - LifeFlow 事项时间线插件，将你的生活事件以时间线的方式进行管理和展示。

## 功能特性

### 🎯 核心功能
- **时间线展示**: 按时间顺序展示生活事件和事项
- **事件管理**: 添加、编辑、删除生活事件
- **时间排序**: 自动按日期和时间排序事件
- **搜索功能**: 快速搜索和筛选事件
- **地址记录**: 记录事件发生的地点信息

### 📊 数据格式
使用TOML格式存储事件数据，与Obsidian的Markdown文件完美集成：

```toml
[detail]

[[detail.stories]]
name = "完成项目报告"
date = "2024-01-15"
time_start = "09:00"
time_end = "17:00"
description = "整理项目文档，准备汇报材料"
address = { name = "办公室" }

[[detail.stories]]
name = "学习新技术"
date = "2024-01-15"
time_start = "19:00"
time_end = "21:00"
description = "学习React和TypeScript，完成练习项目"
address = { name = "家里" }
```

### 🔧 插件命令

1. **打开 LaC.LifeFlow** - 打开时间线视图
2. **文件右键菜单** - 用 LifeFlow 打开 Markdown 文件

### 📁 文件结构

插件会在指定的文件夹中创建以下文件：
- `lifeflow.md` - 根文件，包含所有事件的TOML数据

### ⚙️ 设置选项

- **入口文件**: 指定存储事件数据的文件路径（默认：LaC/LifeFlow/lifeflow.md）
- **启用右键菜单**: 是否在文件右键菜单中显示"用 LaC.LifeFlow 打开"选项
- **语言设置**: 界面语言（自动/中文/英文）

## 使用方法

### 1. 安装插件
将插件文件夹复制到 `.obsidian/plugins/` 目录下，然后在Obsidian中启用插件。

### 2. 打开时间线
使用命令面板（Ctrl+P）搜索"打开 LaC.LifeFlow"，插件会自动创建示例数据文件。

### 3. 管理事件
在时间线界面中：
- **添加事件**: 点击"+"按钮添加新事件
- **编辑事件**: 点击事件卡片进行编辑
- **删除事件**: 在编辑界面中删除事件
- **搜索事件**: 使用搜索框快速查找事件

### 4. 时间排序规则
- 严格按事件发生日期升序排列
- 同一天内的事件按时间先后排序
- 无明确时间的事件保持文档中的原始顺序

## 技术实现

- 使用Obsidian Plugin API进行文件操作
- 支持TOML格式的数据存储
- React + TypeScript 构建响应式UI
- 支持移动端和桌面端
- 完全本地存储，保护用户隐私

## 开发说明

插件基于Obsidian Plugin API开发，主要组件：

- `LifeFlowPlugin`: 主插件类
- `LifeFlowView`: 时间线视图组件
- `StoryList`: 事件列表组件
- `StoryEditModal`: 事件编辑模态框
- `SearchComponent`: 搜索组件

## 许可证

MIT License

## todo
1. 地图搜索国外
1. 弹出搜索列表后如果有任何跟地图图层的交互(拖拽/点击/放大缩小), 则关闭搜索列表
1. 地图选点显示address(search poi by coord)
1. 保存story bug