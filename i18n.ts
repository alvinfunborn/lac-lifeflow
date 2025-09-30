export type LocaleSetting = 'auto' | 'zh' | 'en';

let currentLocale: 'zh' | 'en' = 'zh';

export function resolveLocale(locale: LocaleSetting | undefined): 'zh' | 'en' {
	if (!locale || locale === 'auto') {
		try {
			const lang = (navigator.language || '').toLowerCase();
			return lang.startsWith('zh') ? 'zh' : 'en';
		} catch (_) {
			return 'en';
		}
	}
	return locale;
}

export function setLocale(locale: LocaleSetting | 'zh' | 'en'): void {
    currentLocale = resolveLocale(locale as LocaleSetting);
}

export function getCurrentLocale(): 'zh' | 'en' {
	return currentLocale;
}

type Dict = Record<string, { zh: string; en: string }>

const dict: Dict = {
	// Common
	'common.confirm': { zh: '确定', en: 'Confirm' },
	'common.cancel': { zh: '取消', en: 'Cancel' },
	'common.delete': { zh: '删除', en: 'Delete' },
	'common.save': { zh: '保存', en: 'Save' },
	'common.back': { zh: '返回', en: 'Back' },
	'common.add': { zh: '添加', en: 'Add' },
	'common.search': { zh: '搜索', en: 'Search' },
	'common.edit': { zh: '编辑', en: 'Edit' },
	'common.close': { zh: '关闭', en: 'Close' },
	'common.next': { zh: '下一个', en: 'Next' },
	'common.previous': { zh: '上一个', en: 'Previous' },
	'common.today': { zh: '今天', en: 'Today' },
	'common.yesterday': { zh: '昨天', en: 'Yesterday' },
	'common.tomorrow': { zh: '明天', en: 'Tomorrow' },
	'common.clear': { zh: '清除', en: 'Clear' },

	// Menu / Command
	'menu.openWith': { zh: '用 LaC.LifeFlow 打开', en: 'Open with LaC.LifeFlow' },
	'command.open': { zh: 'Open', en: 'Open' },
	'notice.entryFileNotExist': { zh: '入口文件不存在', en: 'Entry file does not exist' },
	'notice.invalidTomlFormat': { zh: '文件必须是有效的LifeFlow TOML格式，包含[detail]和[[detail.stories]]结构', en: 'File must be valid LifeFlow TOML format with [detail] and [[detail.stories]] structure' },
	'notice.openFailed': { zh: '打开失败', en: 'Open failed' },
	'notice.writeFailed': { zh: '写入 lifeflow.md 失败', en: 'Failed to write lifeflow.md' },
	'notice.saveFailed': { zh: '保存失败', en: 'Save failed' },

	// Settings
	'settings.title': { zh: 'LaC.LifeFlow 设置', en: 'LaC.LifeFlow Settings' },
	'settings.description': { zh: 'LaC.LifeFlow 是一个生活流水记录插件，用于记录和管理日常事件。', en: 'LaC.LifeFlow is a life flow recording plugin for recording and managing daily events.' },
	'settings.tomlDescription': { zh: '入口文件应包含 TOML 格式的数据，用于存储生活流水记录。', en: 'Entry file should contain TOML format data for storing life flow records.' },
	'settings.tomlExample': { zh: 'TOML 格式示例：', en: 'TOML format example:' },
	'settings.usage': { zh: '使用说明：', en: 'Usage instructions:' },
	'settings.usage.openView': { zh: '打开视图：按 Ctrl+P 搜索"LaC.LifeFlow: Open"命令，或在 Markdown 文件右键菜单中选择"用 LaC.LifeFlow 打开"', en: 'Open view: Press Ctrl+P to search for "LaC.LifeFlow: Open" command, or right-click on Markdown file and select "Open with LaC.LifeFlow"' },
	'settings.usage.dataFormat': { zh: '数据格式：确保入口文件包含正确的 TOML 格式，否则会显示错误提示', en: 'Data format: Ensure entry file contains correct TOML format, otherwise error message will be shown' },
	'settings.entryFile.name': { zh: '入口文件', en: 'Entry file' },
	'settings.entryFile.desc': { zh: 'LifeFlow 数据文件的路径', en: 'Path to LifeFlow data file' },
	'settings.contextMenu.name': { zh: '启用右键菜单', en: 'Enable context menu' },
	'settings.contextMenu.desc': { zh: '在 Markdown 文件右键菜单中显示"用 LaC.LifeFlow 打开"选项', en: 'Show "Open with LaC.LifeFlow" option in Markdown file context menu' },
	'settings.locale.name': { zh: 'Language/语言', en: 'Language' },
	'settings.locale.desc': { zh: '选择插件界面语言', en: 'Select plugin interface language' },
	'settings.locale.option.auto': { zh: '自动检测', en: 'Auto detect' },
	'settings.locale.option.zh': { zh: '中文', en: 'Chinese' },
	'settings.locale.option.en': { zh: 'English', en: 'English' },

	// Story form
	'form.editStory': { zh: '编辑事项', en: 'Edit Story' },
	'form.name': { zh: '名称', en: 'Name' },
	'form.date': { zh: '日期', en: 'Date' },
	'form.timeStart': { zh: '开始时间', en: 'Start time' },
	'form.timeEnd': { zh: '结束时间', en: 'End time' },
	'form.description': { zh: '描述', en: 'Description' },
	'form.address': { zh: '地址', en: 'Address' },
	'form.name.placeholder': { zh: '故事名称', en: 'Story name' },
	'form.date.placeholder': { zh: 'YYYY-MM-DD', en: 'YYYY-MM-DD' },
	'form.timeStart.placeholder': { zh: 'HH:MM', en: 'HH:MM' },
	'form.timeEnd.placeholder': { zh: 'HH:MM', en: 'HH:MM' },
	'form.description.placeholder': { zh: '故事描述', en: 'Story description' },
	'form.address.placeholder': { zh: '地址名称', en: 'Address name' },
	'form.error.nameRequired': { zh: '请填写名称', en: 'Please enter a name' },
	'form.error.dateInvalid': { zh: '请填写有效的日期', en: 'Please enter a valid date' },
	'form.error.timeInvalid': { zh: '请填写有效的时间', en: 'Please enter a valid time' },
	'form.error.endTimeBeforeStart': { zh: '结束时间不能早于开始时间', en: 'End time cannot be earlier than start time' },

	// Story list
	'storyList.empty': { zh: '暂无故事', en: 'No stories' },
	'storyList.loading': { zh: '加载中...', en: 'Loading...' },
	'storyList.resort': { zh: '重新排序', en: 'Resort' },
	'storyList.moveUp': { zh: '上移', en: 'Move up' },
	'storyList.moveDown': { zh: '下移', en: 'Move down' },
	'storyList.addStory': { zh: '添加故事', en: 'Add story' },
	'storyList.editStory': { zh: '编辑故事', en: 'Edit story' },
	'storyList.deleteStory': { zh: '删除故事', en: 'Delete story' },
	'storyList.confirmDelete': { zh: '确定要删除故事 "{name}" 吗？', en: 'Are you sure to delete story "{name}"?' },

	// Confirm modal
	'confirm.title': { zh: '确认操作', en: 'Confirm Action' },
	'confirm.deleteStory': { zh: '确定删除"{name}"吗？', en: 'Are you sure to delete "{name}"?' },
	'confirm.abandonCreate': { zh: '放弃创建此事项？', en: 'Abandon creating this item?' },
	'confirm.abandon': { zh: '放弃', en: 'Abandon' },
	'confirm.deleteItem': { zh: '此事项', en: 'this item' },

	// Date navigation
	'dateNav.today': { zh: '今天', en: 'Today' },
	'dateNav.jumpToDate': { zh: '跳转到日期', en: 'Jump to date' },

	// Date/Time picker
	'date.pick': { zh: '选择日期', en: 'Pick date' },
	'time.pick': { zh: '选择时间', en: 'Pick time' },
	
	// Form validation errors
	'form.error.timeFormatInvalid': { zh: '时间格式无效，支持：yyyy-MM-dd HH:mm:ss、yyyy-MM-dd、HH:mm:ss', en: 'Invalid time format, supported: yyyy-MM-dd HH:mm:ss, yyyy-MM-dd, HH:mm:ss' },
	'form.error.startTimeInvalid': { zh: '开始时间格式无效', en: 'Invalid start time format' },
	'form.error.endTimeInvalid': { zh: '结束时间格式无效', en: 'Invalid end time format' },
	'form.error.timeRangeInvalid': { zh: '时间范围无效', en: 'Invalid time range' },

	// Search
	'search.placeholder': { zh: '搜索事件...', en: 'Search stories...' },
	'search.title': { zh: '搜索事件', en: 'Search events' },
	'search.clear': { zh: '清除搜索', en: 'Clear search' },
	'search.noResults': { zh: '没有找到匹配的故事', en: 'No matching stories found' },

	// Minimap
	'minimap.title': { zh: '时间轴', en: 'Timeline' },
	'minimap.undated': { zh: '未定日期', en: 'Undated' },
	'minimap.events': { zh: '个事件', en: ' events' },
	
	// Story card
	'storyCard.moveUp': { zh: '上移', en: 'Move up' },
	'storyCard.moveDown': { zh: '下移', en: 'Move down' },
	
	// Main plugin
	'main.sampleItem1': { zh: '示例事项1', en: 'Sample Item 1' },
	'main.sampleItem2': { zh: '示例事项2', en: 'Sample Item 2' },
	'main.sampleItem3': { zh: '示例事项3', en: 'Sample Item 3' },
	'main.office': { zh: '办公室', en: 'Office' },
	'main.home': { zh: '家里', en: 'Home' },
	'main.shoppingMall': { zh: '购物中心', en: 'Shopping Mall' },
	'main.completeProjectReport': { zh: '完成项目报告，整理文档', en: 'Complete project report, organize documents' },
	'main.learnNewTech': { zh: '学习新技术，完成练习', en: 'Learn new technology, complete exercises' },
	'main.weekendShopping': { zh: '周末购物，购买生活用品', en: 'Weekend shopping, buy daily necessities' },
	
	// Time validation errors
	'timeValidation.startTimeNoDate': { zh: '如果开始时间没有日期，结束时间也不应该有日期', en: 'If start time has no date, end time should also have no date' },
	'timeValidation.invalidFormat': { zh: '时间格式无效', en: 'Invalid time format' },
	'timeValidation.endTimeMustBeAfter': { zh: '结束时间必须大于开始时间', en: 'End time must be after start time' },
	
	// Repository notices
	'notice.nameExists': { zh: '名称已存在，请使用其他名称', en: 'Name already exists, please use a different name' },
	
	// Map components
	'map.title': { zh: '选择地点', en: 'Select Location' },
	'map.placeholder': { zh: '搜索地点...', en: 'Search places...' },
	'map.addressPlaceholder': { zh: '请输入地址...', en: 'Enter address...' },
	'map.loading': { zh: '地图加载中...', en: 'Loading map...' },
	'map.cancel': { zh: '取消', en: 'Cancel' },
	'map.confirm': { zh: '确认', en: 'Confirm' },
	'map.clear': { zh: '清除', en: 'Clear' },
	'map.closeResults': { zh: '关闭搜索结果', en: 'Close search results' },
	'map.searching': { zh: '搜索中...', en: 'Searching...' },
	'map.search': { zh: '搜索', en: 'Search' },
	'map.noResults': { zh: '未找到相关地点，请尝试其他关键词', en: 'No places found, please try other keywords' },
	'map.searchFailed': { zh: '搜索失败，请重试', en: 'Search failed, please try again' },
	'map.selectedLocation': { zh: '选中位置', en: 'Selected location' },
	'map.clearConfirm': { zh: '确定要清除地址吗？', en: 'Are you sure to clear the address?' },
	'map.clearConfirmTitle': { zh: '清除地址', en: 'Clear Address' },
	'map.clearConfirmMessage': { zh: '此操作将清除当前选中的地址信息，确定要继续吗？', en: 'This will clear the currently selected address information. Are you sure to continue?' },
	'map.clearConfirmCancel': { zh: '取消', en: 'Cancel' },
	'map.clearConfirmConfirm': { zh: '确定清除', en: 'Confirm Clear' },
};

function formatVars(input: string, vars?: Record<string, string | number>): string {
	if (!vars) return input;
	return input.replace(/\{(\w+)\}/g, (_m, k) => String(vars[k] ?? ''));
}

export function t(key: string, vars?: Record<string, string | number>, locale?: 'zh' | 'en'): string {
	const lang = locale || currentLocale;
    const entry = (dict as Record<string, { zh: string; en: string }>)[key];
	if (!entry) return key;
    const raw = entry[lang] ?? entry.en ?? key;
	return formatVars(raw, vars);
}