declare module 'obsidian' {
  export interface App {
    vault: any;
    workspace: any;
  }

  export class Plugin {
    app: any;
    registerView(type: string, factory: (leaf: any) => any): void;
    addCommand(command: any): void;
    registerEvent(eventRef: any): void;
    addSettingTab(tab: PluginSettingTab): void;
    onload(): Promise<void> | void;
    onunload(): Promise<void> | void;
    loadData(): Promise<any>;
    saveData(data: any): Promise<void>;
  }

  export class PluginSettingTab {
    app: any;
    plugin: any;
    containerEl: HTMLElement;
    constructor(app: any, plugin: any);
    display(): void;
  }

  export class Setting {
    constructor(containerEl: HTMLElement);
    setName(name: string): Setting;
    setDesc(desc: string): Setting;
    addText(callback: (text: any) => void): Setting;
    addToggle(callback: (toggle: any) => void): Setting;
    addDropdown(callback: (dropdown: any) => void): Setting;
  }

  export class ItemView {
    containerEl: HTMLElement;
    constructor(leaf: any);
    getViewType(): string;
    getDisplayText(): string;
    onOpen(): Promise<void> | void;
    onClose(): Promise<void> | void;
  }

  export class Notice {
    constructor(message: string, duration?: number);
  }

  export class TFile { extension: string; path: string; }

  export interface WorkspaceLeaf {
    setViewState(state: any): Promise<void>;
  }
}

declare module 'react' {
  const React: any;
  export default React;
  export const useState: any;
  export const useEffect: any;
  export const useRef: any;
}

declare module 'react-dom' {
  const ReactDOM: any;
  export default ReactDOM;
}

declare module 'react-dom/client' {
  export type Root = any;
  export function createRoot(container: Element | DocumentFragment): Root;
}

// 浏览器端 TOML 解析库简易类型声明
declare module '@ltd/j-toml' {
  const TOML: any; // 仅用于编译期消除类型错误
  export default TOML;
}

// 浏览器端 TOML 解析库（toml）最简类型声明
declare module 'toml' {
  export function parse(input: string): any;
}

// 高德地图API类型声明
declare global {
  interface Window {
    AMap: any;
  }
}

export {};
