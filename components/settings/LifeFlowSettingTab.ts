import { App, PluginSettingTab, Setting } from 'obsidian';
import LifeFlowPlugin from '../../main';
import { t } from '../../i18n';

// 设置标签
export class LifeFlowSettingTab extends PluginSettingTab {
    plugin: LifeFlowPlugin;

    constructor(app: App, plugin: LifeFlowPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        // —— 格式与用法说明 ——
        containerEl.createEl('p', { text: t('settings.description'), cls: 'setting-item-description' });
        containerEl.createEl('p', { text: t('settings.tomlDescription'), cls: 'setting-item-description' });
        
        // TOML格式示例
        const tomlExample = `[detail]

[[detail.stories]]
name = "完成项目报告"
date = "2025-01-01"
time_start = "09:00"
time_end = "17:00"
description = "整理项目文档，准备汇报材料"
address = { name = "办公室" }

[[detail.stories]]
name = "学习新技术"
date = "2025-01-01"
time_start = "19:00"
time_end = "21:00"
description = "学习React和TypeScript，完成练习项目"
address = { name = "家里" }`;
        
        containerEl.createEl('p', { text: t('settings.tomlExample'), cls: 'setting-item-description' });
        containerEl.createEl('pre', { text: tomlExample, cls: 'setting-item-description' });
        
        // 使用说明
        containerEl.createEl('p', { text: t('settings.usage'), cls: 'setting-item-description' });
        containerEl.createEl('ul', { cls: 'setting-item-description' }, (ul) => {
            ul.createEl('li', { text: t('settings.usage.openView') });
            ul.createEl('li', { text: t('settings.usage.dataFormat') });
        });

        // 通用设置放在顶部，不添加标题
        new Setting(containerEl)
            .setName(t('settings.entryFile.name'))
            .setDesc(t('settings.entryFile.desc'))
            .addText((text: any) => text
                .setPlaceholder('LaC/LifeFlow/lifeflow.md')
                .setValue(this.plugin.settings.entryFile || 'LaC/LifeFlow/lifeflow.md')
                .onChange(async (value: string) => {
                    this.plugin.settings.entryFile = value?.trim() || 'LaC/LifeFlow/lifeflow.md';
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(t('settings.contextMenu.name'))
            .setDesc(t('settings.contextMenu.desc'))
            .addToggle((toggle: any) => toggle
                .setValue(this.plugin.settings.enableContextMenu)
                .onChange(async (value: boolean) => {
                    this.plugin.settings.enableContextMenu = !!value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(t('settings.locale.name'))
            .setDesc(t('settings.locale.desc'))
            .addDropdown((dropdown: any) => dropdown
                .addOption('auto', t('settings.locale.option.auto'))
                .addOption('zh', t('settings.locale.option.zh'))
                .addOption('en', t('settings.locale.option.en'))
                .setValue(this.plugin.settings.locale || 'auto')
                .onChange(async (value: string) => {
                    this.plugin.settings.locale = value as 'auto' | 'zh' | 'en';
                    await this.plugin.saveSettings();
                }));

        // 地图设置分组
        containerEl.createEl('h3', { text: 'Map settings' });
        
        new Setting(containerEl)
            .setName('Map API provider')
            .setDesc('Choose a map service provider for address selection and coordinate conversion')
            .addDropdown((dropdown: any) => dropdown
                .addOption('none', 'None')
                .addOption('gaode', '高德')
                .setValue(this.plugin.settings.mapApiProvider || 'none')
                .onChange(async (value: string) => {
                    this.plugin.settings.mapApiProvider = value as 'none' | 'gaode';
                    await this.plugin.saveSettings();
                    // 重新渲染设置界面以显示/隐藏高德Key设置
                    this.display();
                }));

        // 只有选择高德时才显示高德Web服务Key设置
        if (this.plugin.settings.mapApiProvider === 'gaode') {
            new Setting(containerEl)
                .setName('Gaode web service key')
                .setDesc('API key for Gaode map web services, used for address search and coordinate conversion')
                .addText((text: any) => text
                    .setPlaceholder('Enter your Gaode web service key')
                    .setValue(this.plugin.settings.gaodeWebServiceKey || '')
                    .onChange(async (value: string) => {
                        this.plugin.settings.gaodeWebServiceKey = value?.trim() || '';
                        await this.plugin.saveSettings();
                    }));
        }
    }
}
