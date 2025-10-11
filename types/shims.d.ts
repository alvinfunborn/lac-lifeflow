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
    google: any;
  }
  
  // Google Maps API 类型声明
  namespace google {
    namespace maps {
      class Map {
        constructor(element: HTMLElement, options: any);
        setCenter(latlng: any): void;
        setZoom(zoom: number): void;
        addListener(event: string, handler: Function): void;
        fitBounds(bounds: any): void;
      }
      
      class Marker {
        constructor(options: any);
        setPosition(position: any): void;
        setTitle(title: string): void;
        setMap(map: Map | null): void;
        addListener(event: string, handler: Function): void;
      }
      
      class LatLng {
        constructor(lat: number, lng: number);
        lat(): number;
        lng(): number;
      }
      
      class LatLngBounds {
        constructor();
        extend(point: LatLng): void;
      }
      
      interface MapMouseEvent {
        latLng: LatLng | null;
      }
      
      // 控件位置枚举
      enum ControlPosition {
        BOTTOM_CENTER = 11,
        BOTTOM_LEFT = 10,
        BOTTOM_RIGHT = 12,
        LEFT_BOTTOM = 6,
        LEFT_CENTER = 4,
        LEFT_TOP = 5,
        RIGHT_BOTTOM = 9,
        RIGHT_CENTER = 8,
        RIGHT_TOP = 7,
        TOP_CENTER = 2,
        TOP_LEFT = 1,
        TOP_RIGHT = 3
      }
      
      // 地图类型控件样式
      enum MapTypeControlStyle {
        DEFAULT = 0,
        HORIZONTAL_BAR = 1,
        DROPDOWN_MENU = 2
      }
      
      namespace places {
        class PlacesService {
          constructor(map: Map);
          textSearch(request: any, callback: (results: any[], status: any) => void): void;
        }
        
        enum PlacesServiceStatus {
          OK = 'OK'
        }
      }
      
      class Geocoder {
        constructor();
        geocode(request: any, callback: (results: any[], status: string) => void): void;
      }
    }
  }
}

export {};
