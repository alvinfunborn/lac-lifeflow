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

**根文件 (lifeflow.md):**
```toml
type = "root"
renders = ["lifeflow"]

[[TestEvent1]]
[[TestEvent2]]
[[Watching Netflix]]
```

**事件文件 (TestEvent1.md):**
```toml
name = "Practice Coding"

[detail]
start_time = "2025-07-17 13:09"
end_time = "2025-07-17 14:21"
address = { name = "Beach" }
description = "Explored new places"
```

**带地址信息的事件文件:**
```toml
name = "Watching Netflix"

[detail]
start_time = "2025-10-01 14:02"
end_time = "2025-10-01 18:59"
description = "Made delicious food12"

[detail.address]
name = "小米之家(天洋广场店)"
address = "燕郊镇天洋广场c馆一层小米之家"
longitude = 116.821768
latitude = 39.964811
coordinate_system = "GCJ-02"
```

### 🔧 插件命令

1. **打开 LaC.LifeFlow** - 打开时间线视图
2. **文件右键菜单** - 用 LifeFlow 打开 Markdown 文件

### 📁 文件结构

插件会在指定的文件夹中创建以下文件：
- `lifeflow.md` - 根文件，包含事件引用列表
- `TestEvent1.md` - 事件文件，包含具体的事件数据
- `TestEvent2.md` - 事件文件，包含具体的事件数据
- `Watching Netflix.md` - 事件文件，包含具体的事件数据
- ... 更多事件文件

### ⚙️ 设置选项

- **入口文件**: 指定存储事件数据的文件路径（默认：LaC/LifeFlow/lifeflow.md）
- **启用右键菜单**: 是否在文件右键菜单中显示"用 LaC.LifeFlow 打开"选项
- **语言设置**: 界面语言（自动/中文/英文）
- **地图API提供商**: 选择地图服务提供商（无/高德）
- **高德Web服务Key**: 高德地图API密钥，用于地址搜索和坐标转换

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
- **地址选择**: 点击地址字段打开地图选择器，选择事件发生地点

### 4. 时间排序规则
- 严格按事件发生日期升序排列
- 同一天内的事件按时间先后排序
- 无明确时间的事件保持文档中的原始顺序

### 5. 文件组织方式
- **根文件**: `lifeflow.md` 包含所有事件的引用列表
- **事件文件**: 每个事件都有独立的 `.md` 文件，包含完整的事件数据
- **地址信息**: 支持简单地址和详细坐标信息
- **时间格式**: 使用 `start_time` 和 `end_time` 字段，格式为 "YYYY-MM-DD HH:mm"

## 技术实现

- 使用Obsidian Plugin API进行文件操作
- 支持TOML格式的数据存储
- React + TypeScript 构建响应式UI
- 支持移动端和桌面端
- 完全本地存储，保护用户隐私
- 集成高德地图API，支持地址搜索和坐标转换
- 支持多语言界面（中文/英文）
- 分布式文件存储：每个事件独立文件，便于管理和版本控制
- 支持多种坐标系统：WGS84、GCJ-02、BD-09

## 开发说明

插件基于Obsidian Plugin API开发，主要组件：

- `LifeFlowPlugin`: 主插件类
- `LifeFlowView`: 时间线视图组件
- `StoryList`: 事件列表组件
- `StoryEditModal`: 事件编辑模态框
- `SearchComponent`: 搜索组件
- `MapSelector`: 地图选择器组件
- `AddressInput`: 地址输入组件
- `LifeFlowRepository`: 数据仓库类

## 许可证

MIT License

## TODO
1. 地图比例尺
1. 点击minimap滚动