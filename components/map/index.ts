// 地图组件导出文件 - 方便其他项目复用
export { default as MapSelector } from './MapSelector';
export { default as AddressInput } from './AddressInput';
export { loadAMapAPI, createAmapConfig } from './Amap';

// 类型导出
export type {
  MapLocation,
  MapSearchResult,
  MapSelectorProps,
  MapConfig,
  AMapLocation,
  AMapSearchResult
} from '../../types/map';
