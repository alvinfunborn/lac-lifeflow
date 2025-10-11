import { MapLocation, MapSearchResult } from '../../../types/map';

/**
 * 地图提供商接口
 * 所有地图实现必须遵循此接口
 */
export interface IMapProvider {
  /**
   * 初始化地图实例
   * @param container 地图容器 DOM 元素
   * @param initialLocation 初始位置（可选）
   */
  initMap(container: HTMLElement, initialLocation?: MapLocation, availableProviders?: string[]): Promise<void>;
  
  /**
   * 设置地图中心点和缩放级别
   * @param lng 经度
   * @param lat 纬度
   * @param zoom 缩放级别（可选）
   */
  setCenter(lng: number, lat: number, zoom?: number): void;
  
  /**
   * 添加标记到地图
   * @param lng 经度
   * @param lat 纬度
   * @param title 标记标题（可选）
   * @returns 标记实例
   */
  addMarker(lng: number, lat: number, title?: string): any;
  
  /**
   * 移除标记
   * @param marker 标记实例
   */
  removeMarker(marker: any): void;
  
  /**
   * 搜索地点
   * @param keyword 搜索关键词
   * @returns 搜索结果列表
   */
  searchPlaces(keyword: string): Promise<MapSearchResult[]>;
  
  /**
   * 逆地理编码（根据坐标获取地址）
   * @param lng 经度
   * @param lat 纬度
   * @returns 地址位置信息
   */
  getAddressByCoordinates(lng: number, lat: number): Promise<MapLocation | null>;
  
  /**
   * 在地图上显示搜索结果标记
   * @param results 搜索结果列表
   * @param onClick 点击标记的回调函数
   * @returns 标记实例数组
   */
  displaySearchMarkers(results: MapSearchResult[], onClick: (index: number) => void): any[];
  
  /**
   * 清除多个标记
   * @param markers 标记实例数组
   */
  clearMarkers(markers: any[]): void;
  
  /**
   * 绑定地图点击事件
   * @param handler 点击事件处理函数
   */
  onMapClick(handler: (lng: number, lat: number) => void): void;
  
  /**
   * 转换坐标系统到当前地图使用的坐标系
   * @param location 位置信息
   * @returns 转换后的坐标 [lng, lat]
   */
  convertCoordinates(location: MapLocation): Promise<[number, number]>;
  
  /**
   * 获取当前地图使用的坐标系统名称
   * @returns 坐标系统名称（如 'WGS84', 'GCJ-02'）
   */
  getCoordinateSystem(): string;
  
  /**
   * 销毁地图实例，释放资源
   */
  destroy(): void;
}

