import { Plugin, TFile, Notice, WorkspaceLeaf, ItemView } from 'obsidian';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { LifeFlowSettings, DEFAULT_SETTINGS } from './types';
import { setLocale, t } from './i18n';
import Index from './pages/index/index';
import { LifeFlowSettingTab } from './components/settings/LifeFlowSettingTab';
import { LifeFlowRepository } from './repositories/LifeFlowRepository';

const VIEW_TYPE = 'lac-lifeflow-view';

class LifeFlowView extends ItemView {
    private filePath: string = '';
    private rootEl: HTMLElement | null = null;
    private reactRoot: Root | null = null;
    private repository: LifeFlowRepository | null = null;

    constructor(leaf: WorkspaceLeaf, private plugin: LifeFlowPlugin) {
        super(leaf);
    }

    getViewType() { return VIEW_TYPE; }
    getDisplayText() { return 'LaC.LifeFlow'; }

    async onOpen() {
        this.containerEl.empty();
        this.rootEl = this.containerEl.createDiv({ cls: 'lac-lifeflow-root' });
        if (this.rootEl) {
            this.reactRoot = createRoot(this.rootEl);
            
            // 如果有文件路径，初始化 repository
            if (this.filePath) {
                this.repository = new LifeFlowRepository(this.plugin.app, this.filePath);
            }
            
            this.reactRoot.render(React.createElement(Index, { repository: this.repository, settings: this.plugin.settings }));
        }
    }

    async onClose() {
        if (this.reactRoot) {
            this.reactRoot.unmount();
            this.reactRoot = null;
        }
        this.rootEl = null;
    }

    getState(): any {
        return { filePath: this.filePath };
    }

    async setState(state: any) {
        if (state) {
            if (typeof state.filePath === 'string') this.filePath = state.filePath;
            
            // 重新初始化 repository
            if (this.filePath) {
                this.repository = new LifeFlowRepository(this.plugin.app, this.filePath);
                if (this.reactRoot) {
                    this.reactRoot.render(React.createElement(Index, { repository: this.repository, settings: this.plugin.settings }));
                }
            }
        }
    }
}

export default class LifeFlowPlugin extends Plugin {
    private hasInitialized = false;
    settings!: LifeFlowSettings;

    async onload() {
        await this.loadSettings();
        setLocale(this.settings.locale || 'auto');

        this.registerView(VIEW_TYPE, (leaf) => new LifeFlowView(leaf, this));

        // 允许 Obsidian 在重启后自动恢复已打开的 LifeFlow 视图
        // 不再在布局恢复后主动分离该视图

        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (!this.settings.enableContextMenu) return;
                if (file instanceof TFile && file.extension === 'md') {
                    menu.addItem((item) => {
                        item
                            .setTitle(t('menu.openWith'))
                            .setIcon('calendar-with-checkmark')
                            .onClick(async () => {
                                await this.openWithFile(file.path);
                            });
                    });
                }
            })
        );

        this.addCommand({
            id: 'open-lac-lifeflow',
            name: t('command.open'),
            callback: async () => {
                const entryPath = this.settings.entryFile || 'LaC/LifeFlow/lifeflow.md';
                const ensureFolderExists = async (folderPath: string) => {
                    const folder = this.app.vault.getAbstractFileByPath(folderPath);
                    if (!folder) {
                        await this.app.vault.createFolder(folderPath);
                    }
                };

                // 1) 若入口文件不存在且尚未初始化：创建并写入示例内容
                const entryFile = this.app.vault.getAbstractFileByPath(entryPath);
                const parts = entryPath.split('/');
                const folderPath = parts.slice(0, -1).join('/') || '';
                const storiesFolder = folderPath || 'LaC/LifeFlow';
                
                if (!entryFile) {
                    // 检查是否已经存在stories文件，如果存在则不初始化
                    const existingStories = this.app.vault.getMarkdownFiles().filter(file => 
                        file.path.includes('LaC/LifeFlow') && 
                        !file.path.includes('lifeflow.md')
                    );
                    
                    if (existingStories.length === 0) {
                        this.hasInitialized = true;
                    if (folderPath) await ensureFolderExists(folderPath);

                    // 创建包含TOML头部和子文件链接的演示数据
                    const sampleEntry = `type = "root"
renders = ["lifeflow"]

[[${t('main.sampleItem1')}]]
[[${t('main.sampleItem2')}]]
[[${t('main.sampleItem3')}]]
`;
                    await this.app.vault.create(entryPath, sampleEntry);

                    // 创建示例子文件（使用普通名称）
                    
                    const makeStoryToml = (name: string, startTime: string, endTime: string, address: string, description: string) => {
                        const lines: string[] = [];
                        lines.push(`name = "${name}"`);
                        lines.push('');
                        lines.push('[detail]');
                        lines.push(`start_time = "${startTime}"`);
                        lines.push(`end_time = "${endTime}"`);
                        lines.push(`address = { name = "${address}" }`);
                        lines.push(`description = "${description}"`);
                        lines.push('');
                        return lines.join('\n');
                    };

                    const storiesFolder = folderPath || 'LaC/LifeFlow';
                    const today = new Date();
                    const todayString = today.toISOString().split('T')[0];
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayString = yesterday.toISOString().split('T')[0];
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const tomorrowString = tomorrow.toISOString().split('T')[0];

                    // 创建示例子文件
                    const sampleStories = [
                        {
                            name: t('main.sampleItem1'),
                            startTime: `${yesterdayString} 09:00:00`,
                            endTime: '17:00:00',
                            address: t('main.office'),
                            description: t('main.completeProjectReport')
                        },
                        {
                            name: t('main.sampleItem2'),
                            startTime: `${todayString} 19:00:00`,
                            endTime: '21:00:00',
                            address: t('main.home'),
                            description: t('main.learnNewTech')
                        },
                        {
                            name: t('main.sampleItem3'),
                            startTime: `${tomorrowString} 14:00:00`,
                            endTime: '18:00:00',
                            address: t('main.shoppingMall'),
                            description: t('main.weekendShopping')
                        }
                    ];

                    for (const story of sampleStories) {
                        const storyPath = `${storiesFolder}/${story.name}.md`;
                        const storyContent = makeStoryToml(story.name, story.startTime, story.endTime, story.address, story.description);
                        await this.app.vault.create(storyPath, storyContent);
                    }
                    }
                }
                
                // 注意：不再自动迁移，让用户手动重命名需要的文件

                // 2) 使用配置的入口文件打开 LaC.LifeFlow 视图
                // 如果刚刚创建了文件，等待一小段时间确保文件系统同步
                if (!entryFile) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                await this.openWithFile(entryPath);
            }
        });

        // 添加设置标签
        this.addSettingTab(new LifeFlowSettingTab(this.app, this));
    }

    onunload() {
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        setLocale(this.settings.locale || 'auto');
    }


    private async openWithFile(filePath: string) {
        try {
            let file = this.app.vault.getAbstractFileByPath(filePath);
            
            // 如果文件不存在，自动创建演示数据
            if (!file || !(file instanceof TFile)) {
                await this.createInitialData(filePath);
                file = this.app.vault.getAbstractFileByPath(filePath);
                if (!file || !(file instanceof TFile)) {
                    new Notice(t('notice.entryFileNotExist'), 5000);
                    return;
                }
            }
            
            // 使用 Repository 的验证函数
            const repository = new LifeFlowRepository(this.app, filePath);
            const isValid = await repository.isValidEntry();
            if (!isValid) {
                new Notice(t('notice.invalidTomlFormat'), 5000);
                return;
            }
            
            const leaf = this.app.workspace.getLeaf('tab');
            await leaf.setViewState({ type: VIEW_TYPE, state: { filePath: file.path }, active: true });
            this.app.workspace.revealLeaf(leaf);
        } catch (e) {
            console.error('Failed to open file:', e);
            new Notice(t('notice.openFailed'), 5000);
        }
    }

    private async createInitialData(filePath: string) {
        try {
            // 确保文件夹存在
            const pathParts = filePath.split('/');
            if (pathParts.length > 1) {
                const folderPath = pathParts.slice(0, -1).join('/');
                await this.ensureFolderExists(folderPath);
            }

            // 创建根文件
            const sampleEntry = `type = "root"
renders = ["lifeflow"]

[[${t('main.sampleItem1')}]]
[[${t('main.sampleItem2')}]]
[[${t('main.sampleItem3')}]]
`;
            await this.app.vault.create(filePath, sampleEntry);

            // 创建演示事件文件
            const makeStoryToml = (name: string, startTime: string, endTime: string, address: string, description: string) => {
                const lines: string[] = [];
                lines.push(`name = "${name}"`);
                lines.push('');
                lines.push('[detail]');
                lines.push(`start_time = "${startTime}"`);
                lines.push(`end_time = "${endTime}"`);
                lines.push(`address = { name = "${address}" }`);
                lines.push(`description = "${description}"`);
                lines.push('');
                return lines.join('\n');
            };

            const storiesFolder = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'LaC/LifeFlow';
            const today = new Date();
            const todayString = today.toISOString().split('T')[0];
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayString = yesterday.toISOString().split('T')[0];
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowString = tomorrow.toISOString().split('T')[0];

            // 创建演示事件文件
            const sampleStories = [
                {
                    name: t('main.sampleItem1'),
                    startTime: `${yesterdayString} 09:00:00`,
                    endTime: '17:00:00',
                    address: t('main.office'),
                    description: t('main.completeProjectReport')
                },
                {
                    name: t('main.sampleItem2'),
                    startTime: `${todayString} 19:00:00`,
                    endTime: '21:00:00',
                    address: t('main.home'),
                    description: t('main.learnNewTech')
                },
                {
                    name: t('main.sampleItem3'),
                    startTime: `${tomorrowString} 14:00:00`,
                    endTime: '18:00:00',
                    address: t('main.shoppingMall'),
                    description: t('main.weekendShopping')
                }
            ];

            for (const story of sampleStories) {
                const storyFilePath = `${storiesFolder}/${story.name}.md`;
                const storyContent = makeStoryToml(story.name, story.startTime, story.endTime, story.address, story.description);
                await this.app.vault.create(storyFilePath, storyContent);
            }

            new Notice(t('notice.initialDataCreated'), 3000);
        } catch (e) {
            console.error('Failed to create initial data:', e);
            new Notice(t('notice.createInitialDataFailed'), 5000);
        }
    }

    private async ensureFolderExists(folderPath: string) {
        try {
            const folder = this.app.vault.getAbstractFileByPath(folderPath);
            if (!folder) {
                await this.app.vault.createFolder(folderPath);
            }
        } catch (e) {
            console.error('Failed to create folder:', e);
        }
    }
}