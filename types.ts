// 插件设置（LifeFlow）
export interface LifeFlowSettings {
    entryFile: string; // 例如 lifeflow/lifeflow.md
    enableContextMenu: boolean; // 文件右键"用 LaC.LifeFlow 打开"
    locale?: 'auto' | 'zh' | 'en';
    mapApiProvider: 'none' | 'gaode'; // 地图API提供商
    gaodeWebServiceKey?: string; // 高德Web服务Key
}

export const DEFAULT_SETTINGS: LifeFlowSettings = {
    entryFile: 'LaC/LifeFlow/lifeflow.md',
    enableContextMenu: true,
    locale: 'auto',
    mapApiProvider: 'none',
    gaodeWebServiceKey: ''
}
