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
        const tomlExample = `name = "Practice Coding"

[detail]
start_time = "2025-07-17 13:09"
end_time = "2025-07-17 14:21"
address = { name = "Beach" }
description = "Explored new places"

[detail.address]
name = "小米之家(天洋广场店)"
address = "燕郊镇天洋广场c馆一层小米之家"
longitude = 116.821768
latitude = 39.964811
coordinate_system = "GCJ-02"`;
        
        containerEl.createEl('p', { text: t('settings.tomlExample'), cls: 'setting-item-description' });
        containerEl.createEl('pre', { text: tomlExample, cls: 'setting-item-description' });
        
        // 使用说明
        containerEl.createEl('p', { text: t('settings.usage'), cls: 'setting-item-description' });
        containerEl.createEl('ul', { cls: 'setting-item-description' }, (ul) => {
            ul.createEl('li', { text: t('settings.usage.openView') });
            ul.createEl('li', { text: t('settings.usage.dataFormat') });
            ul.createEl('li', { text: t('settings.usage.mapFeature') });
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
        containerEl.createEl('h3', { text: t('settings.map.title') });
        
        new Setting(containerEl)
            .setName(t('settings.map.provider.name'))
            .setDesc(t('settings.map.provider.desc'))
            .addDropdown((dropdown: any) => dropdown
                .addOption('none', t('settings.map.provider.option.none'))
                .addOption('gaode', t('settings.map.provider.option.gaode'))
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
                .setName(t('settings.map.gaodeKey.name'))
                .setDesc(t('settings.map.gaodeKey.desc'))
                .addText((text: any) => text
                    .setPlaceholder(t('settings.map.gaodeKey.placeholder'))
                    .setValue(this.plugin.settings.gaodeWebServiceKey || '')
                    .onChange(async (value: string) => {
                        this.plugin.settings.gaodeWebServiceKey = value?.trim() || '';
                        await this.plugin.saveSettings();
                    }));
        }
    }
}
