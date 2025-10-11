// 地图组件导出文件 - 方便其他项目复用
export { default as MapSelector } from './MapSelector';
export { default as AddressInput } from './AddressInput';

// 工具函数导出（向后兼容）
export { loadAMapAPI, createAmapConfig } from './Amap';
export { loadGoogleMapsAPI, createGoogleMapConfig, CoordinateConverter } from './GoogleMap';

// Provider 导出
export type { IMapProvider } from './providers/IMapProvider';
export { AmapProvider } from './providers/AmapProvider';
export { GoogleMapProvider } from './providers/GoogleMapProvider';
export { MapProviderFactory } from './providers/MapProviderFactory';

// 类型导出
export type {
  MapLocation,
  MapSearchResult,
  MapSelectorProps,
  MapConfig,
  AMapLocation,
  AMapSearchResult
} from '../../types/map';
