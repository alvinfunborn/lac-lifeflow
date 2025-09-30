import { App, TFile, Notice } from 'obsidian';
import { Story } from '../types/story';
import * as TOML from 'toml';
import * as TOMLStringify from 'tomlify-j0.4';
import { t } from '../i18n';

// 文件名作为ID的工具函数
function extractIdFromFilename(filename: string): string {
  // 文件名本身就是ID
  return filename;
}

// LifeFlowRepository类 - 使用Obsidian API
export class LifeFlowRepository {
    private app: App;
    private rootFilePath: string;
    private hasWarnedInvalidEntry: boolean = false;

    constructor(app: App, rootFilePath: string) {
        this.app = app;
        this.rootFilePath = rootFilePath;
    }

    // 获取故事文件夹路径（从根文件路径推导）
    private getStoriesFolder(): string {
        const pathParts = this.rootFilePath.split('/');
        if (pathParts.length > 1) {
            return pathParts.slice(0, -1).join('/');
        }
        return 'stories'; // 默认文件夹
    }

    // 校验入口文件是否有效（type=root 且 renders 包含 lifeflow）
    async isValidEntry(): Promise<boolean> {
        const file = this.app.vault.getAbstractFileByPath(this.rootFilePath);
        if (!file || !(file instanceof TFile)) return false;
        try {
            const content = await this.app.vault.read(file);
            
            // 只解析TOML头部部分，忽略wikilinks
            const lines = content.split('\n');
            const tomlLines: string[] = [];
            
            for (const line of lines) {
                const trimmed = line.trim();
                // 遇到空行或wikilinks时停止
                if (!trimmed || trimmed.startsWith('[[')) {
                    break;
                }
                tomlLines.push(line);
            }
            
            const tomlHeader = tomlLines.join('\n');
            const parsed = this.parseToml(tomlHeader) || {};
            const typeVal = String((parsed as any)['type'] ?? '').toLowerCase();
            let renders: any = (parsed as any)['renders'];
            if (!Array.isArray(renders)) renders = typeof renders === 'string' ? [renders] : [];
            const hasLifeflow = (renders as any[]).map(v => String(v).toLowerCase()).some(s => s.includes('lifeflow'));
            return typeVal === 'root' && hasLifeflow;
        } catch (_) {
            return false;
        }
    }

    // 加载所有故事
    async loadAll(): Promise<Story[]> {
        const rootFile = this.app.vault.getAbstractFileByPath(this.rootFilePath);
        
        if (!rootFile || !(rootFile instanceof TFile)) {
            return [];
        }

        try {
            const content = await this.app.vault.read(rootFile);
            
            const matches = content.match(/\[\[[^\]]+\]\]/g) || [];
            
            const linkTargets = matches
                .map((m: string) => m.replace(/^\[\[|\]\]$/g, ''))
                .map((s: string) => s.split('|')[0]?.trim())
                .filter(Boolean) as string[];
            
            const stories: Story[] = [];
            for (const target of linkTargets) {
                let file: TFile | null = null;
                try {
                    const dest = (this.app as any).metadataCache.getFirstLinkpathDest(target, this.rootFilePath);
                    file = dest && dest instanceof TFile ? dest : null;
                } catch (_) {
                    file = null;
                }
                if (!file) {
                    continue;
                }

                try {
                    const fileContent = await this.app.vault.read(file);
                    const data = this.parseToml(this.quoteWikilinksForToml(fileContent));
                    
                    // 文件名就是ID
                    const storyId = extractIdFromFilename(file.basename);
                    
                    console.log('🔍 [loadAll] Loading story:', {
                        filePath: file.path,
                        basename: file.basename,
                        storyId: storyId,
                        dataName: data.name,
                        hasDetail: !!data.detail
                    });
                    
                    const story: Story = {
                        id: storyId,
                        name: data.name || target,
                        address: data.detail?.address || { name: '' },
                        start_time: data.detail?.start_time || '',
                        end_time: data.detail?.end_time || '',
                        description: data.detail?.description || ''
                    };
                    stories.push(story);
                } catch (e) {
                    console.log('❌ [loadAll] Failed to parse file:', file.path, e);
                    // 跳过解析失败的文件
                }
            }
            return stories;
        } catch (e) {
            console.error('❌ [loadAll] 加载失败:', e);
            return [];
        }
    }

    // 保存故事（使用ID作为文件名，避免重复创建）
    async saveStory(story: Story): Promise<void> {
        const storiesFolder = this.getStoriesFolder();
        
        // 确保文件夹存在
        const folder = this.app.vault.getAbstractFileByPath(storiesFolder);
        if (!folder) {
            await this.app.vault.createFolder(storiesFolder);
        }

        // 1. 构建文件名和路径（优先使用ID，其次使用name）
        const storyId = story.id || story.name || 'unnamed-story';
        const originalFileName = `${storyId}.md`;
        const originalFilePath = `${storiesFolder}/${originalFileName}`;
        
        let fileName = originalFileName;
        let filePath = originalFilePath;
        let targetFile: TFile | null = null;
        
        // 检查文件是否已存在（在整个vault中搜索）
        const allFiles = this.app.vault.getMarkdownFiles();
        
        // 查找现有文件：优先使用ID，其次使用文件中的name
        const existingFile = allFiles.find((file: TFile) => file.basename === storyId);
        
        if (existingFile) {
            // 文件已存在，使用现有文件
            targetFile = existingFile;
            fileName = existingFile.name;
            filePath = existingFile.path;
        } else {
            // 文件不存在，先尝试创建原名文件
            try {
                const initialContent = this.dequoteWikilinks(this.storyToTomlString(story));
                await this.app.vault.create(originalFilePath, initialContent);
                targetFile = this.app.vault.getAbstractFileByPath(originalFilePath) as TFile;
            } catch (e) {
                // 创建失败，尝试编码名称
                const encodedName = encodeURIComponent(storyId);
                const encodedFileName = `${encodedName}.md`;
                const encodedFilePath = `${storiesFolder}/${encodedFileName}`;
                
                const initialContent = this.dequoteWikilinks(this.storyToTomlString(story));
                await this.app.vault.create(encodedFilePath, initialContent);
                targetFile = this.app.vault.getAbstractFileByPath(encodedFilePath) as TFile;
                fileName = encodedFileName;
                filePath = encodedFilePath;
            }
        }
        
        // 2. 设置story的ID为文件名（存储用）
        story.id = targetFile?.basename || fileName.replace('.md', '');
        // 5. 如果目标文件存在，更新内容
        if (targetFile) {
            try {
                const existing = await this.app.vault.read(targetFile);
                
                const rewritten = this.rewriteTomlWithCommentsTop(existing, story);
                
                await this.app.vault.modify(targetFile, this.dequoteWikilinks(rewritten));
            } catch (e) {
                console.error('❌ [saveStory] 更新文件失败:', e);
                new Notice(t('notice.saveFailed'), 5000);
                return;
            }
        }

        // 4. 更新根文件中对该故事的双链引用
        await this.updateRootFile(story, true);
    }

    // 删除故事
    async deleteStory(story: Story): Promise<void> {
        // 更新根文件
        await this.updateRootFile(story, false);
    }

    // 更新根文件
    private async updateRootFile(story: Story, isAdd: boolean): Promise<void> {
        const rootPath = this.rootFilePath;
        let rootContent = '';

        try {
            const rootFile = this.app.vault.getAbstractFileByPath(rootPath);
            if (rootFile && rootFile instanceof TFile) {
                rootContent = await this.app.vault.read(rootFile);
            }
        } catch (e) {
            // 文件不存在，创建新文件
        }

        const storyName = story.name || '';
        const escapedName = this.escapeRegExp(storyName);
        if (isAdd) {
            // 添加故事引用：若已存在任意形式的双链（[[name]] 或 [[name|alias]]）则不重复添加
            const hasAnyLink = new RegExp(`\\[\\[${escapedName}(?:\\|[^\\]]+)?\\]\\]`).test(rootContent);
            if (!hasAnyLink && storyName) {
                rootContent += (rootContent.endsWith('\n') ? '' : '\n') + `[[${storyName}]]\n`;
            }
        } else {
            // 删除故事引用：同时移除 [[name]] 与 [[name|alias]] 的整行或行内片段
            const removePattern = new RegExp(`\\[\\[${escapedName}(?:\\|[^\\]]+)?\\]\\]`, 'g');
            rootContent = rootContent.replace(removePattern, '');
            rootContent = rootContent.replace(/\n{3,}/g, '\n\n').trimEnd();
        }

        const existingRoot = this.app.vault.getAbstractFileByPath(rootPath);
        if (existingRoot && existingRoot instanceof TFile) {
            await this.app.vault.modify(existingRoot, rootContent);
        } else {
            await this.app.vault.create(rootPath, rootContent);
        }
    }

    private escapeRegExp(input: string): string {
        return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 使用标准TOML库解析内容
    private parseToml(content: string): any {
        try {
            // 将CRLF转换为LF，解决Windows系统换行符问题
            const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            return TOML.parse(normalizedContent);
        } catch (error) {
            console.error('TOML parsing error:', error);
            return {};
        }
    }

    // 纯 TOML 重写模式：解析→修改→stringify；将原有注释置顶保留
    private rewriteTomlWithCommentsTop(existing: string, story: Story): string {
        const commentLines: string[] = [];
        const otherLines: string[] = [];
        for (const raw of existing.split('\n')) {
            const t = raw.trim();
            if (t.startsWith('#')) commentLines.push(raw);
            else otherLines.push(raw);
        }
        
        // 检查原有地址格式（内联对象 vs 块对象）
        const hasInlineAddress = this.detectInlineAddressFormat(otherLines.join('\n'));
        
        // 使用已有轻量 parser 读取为对象
        const parsed = this.parseToml(this.quoteWikilinksForToml(otherLines.join('\n'))) || {};

        // 应用仅 lifeflow 相关的字段更新
        parsed['name'] = story.name;
        if (!parsed['detail'] || typeof parsed['detail'] !== 'object') parsed['detail'] = {};
        parsed['detail']['start_time'] = story.start_time || '';
        parsed['detail']['end_time'] = story.end_time || '';
        parsed['detail']['description'] = story.description || '';
        
        // 智能处理地址字段合并和格式保持
        if (story.address) {
            const existingAddress = parsed['detail']?.['address'];
            const mergedAddress = this.mergeAddressFields(existingAddress, story.address);
            
            if (hasInlineAddress && this.canKeepInlineFormat(mergedAddress)) {
                // 保持内联对象格式
                parsed['detail']['address'] = mergedAddress;
                this.preserveInlineAddressFormat = true;
            } else {
                // 使用块格式（保留所有扩展字段）
                parsed['detail']['address'] = mergedAddress;
                this.preserveInlineAddressFormat = false;
            }
        } else {
            // 即使不需要life-flow地址，也要保留现有地址的扩展字段
            const existingAddress = parsed['detail']?.['address'];
            if (existingAddress && typeof existingAddress === 'object') {
                // 过滤掉life-flow字段，保留用户的自定义字段
                const filteredAddress = this.filterLifeFlowAddressFields(existingAddress);
                if (Object.keys(filteredAddress).length > 0) {
                    parsed['detail']['address'] = filteredAddress;
                } else {
                    parsed['detail']['address'] = undefined;
                }
            }
        }

        const tomlBody = TOMLStringify.toToml(parsed);
        const commentBlock = commentLines.length > 0 ? commentLines.join('\n') + '\n\n' : '';
        return commentBlock + tomlBody;
    }

    private preserveInlineAddressFormat = false;

    // 检测是否存在内联地址格式
    private detectInlineAddressFormat(content: string): boolean {
        return /^\s*address\s*=\s*\{[^}]*\}\s*$/.test(content) && !content.includes('[detail.address]');
    }

    // 合并现有地址字段和新的life-flow地址字段
    private mergeAddressFields(existingAddress: any, newAddress: any): any {
        console.log('🔍 [mergeAddressFields] Existing address:', existingAddress);
        console.log('🔍 [mergeAddressFields] New address:', newAddress);
        
        const merged = { ...existingAddress }; // 先复制现有地址的所有字段
        
        // 添加或更新life-flow相关字段
        const lifeFlowFields = ['name', 'address', 'longitude', 'latitude', 'coordinate_system'];
        lifeFlowFields.forEach(field => {
            if (newAddress[field] !== undefined && newAddress[field] !== null && newAddress[field] !== '') {
                merged[field] = newAddress[field];
                console.log(`🔍 [mergeAddressFields] Added/updated field ${field}:`, newAddress[field]);
            } else {
                // 如果新值为undefined、null或空字符串，删除该字段
                delete merged[field];
                console.log(`🔍 [mergeAddressFields] Deleted field ${field} (undefined/null/empty value)`);
            }
        });
        
        console.log('🔍 [mergeAddressFields] Final merged address:', merged);
        return merged;
    }

    // 判断合并后的地址是否可以保持内联格式
    private canKeepInlineFormat(address: any): boolean {
        if (!address) return false;
        
        const lifeFlowFields = ['name', 'address', 'longitude', 'latitude'];
        const nonLifeFlowFields = Object.keys(address).filter(k => !lifeFlowFields.includes(k));
        
        // 只有非life-flow字段不超过2个，且没有复杂的life-flow字段时才能保持内联
        return nonLifeFlowFields.length <= 2 && 
               (!address.hasOwnProperty('address') || address.address === '') &&
               (!address.hasOwnProperty('longitude') || address.longitude === '') &&
               (!address.hasOwnProperty('latitude') || address.latitude === '');
    }

    // 过滤掉life-flow字段，保留用户的自定义字段
    private filterLifeFlowAddressFields(address: any): any {
        const lifeFlowFields = ['name', 'address', 'longitude', 'latitude'];
        const filtered: any = {};
        
        Object.keys(address).forEach(key => {
            if (!lifeFlowFields.includes(key)) {
                filtered[key] = address[key];
            }
        });
        
        return filtered;
    }



    // 将裸的 [[...]] 或 [[...|alias]] 包裹为可被 TOML 解析的字符串
    private quoteWikilinksForToml(content: string): string {
        // 先处理换行符问题
        const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        return normalizedContent.replace(/\[\[[^\]]+\]\]/g, (match: string, offset: number, full: string) => {
            const before = offset > 0 ? full[offset - 1] : '';
            const after = offset + match.length < full.length ? full[offset + match.length] : '';
            if ((before === '"' && after === '"') || (before === '\'' && after === '\'')) {
                return match; // already quoted
            }
            return `"${match}"`;
        });
    }

    // 将 "[[...]]" 或 '[[...]]' 形式还原为裸的双链
    private dequoteWikilinks(content: string): string {
        return content.replace(/(["'])\[\[[^\]]+\]\]\1/g, (match: string) => match.slice(1, -1));
    }

    // 将 Story 转换为 TOML 字符串
    private storyToTomlString(story: Story): string {
        console.log('🔍 [storyToTomlString] Input story:', story);
        
        const storyObj = {
            name: story.name || 'Untitled Story',
            detail: {
                start_time: story.start_time || '',
                end_time: story.end_time || '',
                description: story.description || '',
                ...(story.address && {
                    address: (() => {
                        const addr: any = {};
                        
                        // 只有当字段有值时才添加
                        if (story.address!.name) {
                            addr.name = story.address!.name;
                        }
                        if (story.address!.address) {
                            addr.address = story.address!.address;
                        }
                        if (story.address!.longitude !== undefined) {
                            addr.longitude = story.address!.longitude;
                        }
                        if (story.address!.latitude !== undefined) {
                            addr.latitude = story.address!.latitude;
                        }
                        if (story.address!.coordinate_system) {
                            addr.coordinate_system = story.address!.coordinate_system;
                        }
                        
                        console.log('🔍 [storyToTomlString] Address object:', addr);
                        return addr;
                    })()
                })
            }
        };
        
        console.log('🔍 [storyToTomlString] Final story object:', storyObj);
        const tomlString = TOMLStringify.toToml(storyObj);
        console.log('🔍 [storyToTomlString] Generated TOML:', tomlString);
        
        return tomlString;
    }

}

