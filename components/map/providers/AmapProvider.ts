import { IMapProvider } from './IMapProvider';
import { MapLocation, MapSearchResult } from '../../../types/map';
import { 
  loadAMapAPI, 
  searchPlacesByWebAPI, 
  getAddressByCoordinates, 
  createAmapConfig,
  CoordinateConverter as AmapCoordinateConverter
} from '../Amap';
import { t } from '../../../i18n';

/**
 * 高德地图提供商实现
 */
export class AmapProvider implements IMapProvider {
  private apiKey: string;
  private mapInstance: any = null;
  private currentMarker: any = null;
  private availableProviders?: string[]; // 存储可用的地图提供商
  private clickHandler?: (lng: number, lat: number) => void; // 保存点击回调
  private currentMarkerPosition?: { lng: number; lat: number; title?: string }; // 保存当前标记位置

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async initMap(container: HTMLElement, initialLocation?: MapLocation, availableProviders?: string[]): Promise<void> {
    this.availableProviders = availableProviders; // 保存可用的地图提供商
    const AMap = await loadAMapAPI(this.apiKey);
    const config = createAmapConfig(this.apiKey);
    
    this.mapInstance = new AMap.Map(container, {
      viewMode: '2D',
      zoom: config.zoom,
      center: config.center,
      mapStyle: config.mapStyle,
      resizeEnable: true,
      renderer: 'canvas',
      features: ['bg', 'road', 'building', 'point']
    });

    // 加载比例尺插件 - 放置在右下角
    AMap.plugin('AMap.Scale', () => {
      const scale = new AMap.Scale({
        position: 'RB',  // 右下角 (Right Bottom)
        offset: new AMap.Pixel(10, 10)  // 距离右下角的偏移
      });
      this.mapInstance.addControl(scale);
    });

    // 添加自定义地图类型控件
    this.addCustomMapTypeControl();

    // 添加地图提供商切换控件（如果有多个可用提供商）
    if (availableProviders && availableProviders.length > 1) {
      this.addProviderSwitcherControl(availableProviders);
    }

    // 处理初始位置
    if (initialLocation && initialLocation.longitude && initialLocation.latitude) {
      const [lng, lat] = await this.convertCoordinates(initialLocation);
      this.setCenter(lng, lat, 16);
      this.currentMarker = this.addMarker(lng, lat, initialLocation.name);
    }

    // 强制调整地图大小
    setTimeout(() => {
      if (this.mapInstance) {
        this.mapInstance.getSize();
      }
    }, 200);
  }

  setCenter(lng: number, lat: number, zoom?: number): void {
    if (!this.mapInstance) return;
    this.mapInstance.setCenter([lng, lat]);
    if (zoom !== undefined) {
      this.mapInstance.setZoom(zoom);
    }
  }

  addMarker(lng: number, lat: number, title?: string): any {
    if (!this.mapInstance) return null;
    
    // 保存当前标记位置
    this.currentMarkerPosition = { lng, lat, title };
    
    const AMap = window.AMap;
    const marker = new AMap.Marker({
      position: [lng, lat],
      title: title || t('map.selectedLocation'),
      content: '<div class="lf-map-marker">📍</div>',
      anchor: 'bottom-center'
    });
    
    this.mapInstance.add(marker);
    this.currentMarker = marker;
    return marker;
  }

  removeMarker(marker: any): void {
    if (!this.mapInstance || !marker) return;
    this.mapInstance.remove(marker);
    
    // 如果移除的是当前标记，清除保存的位置
    if (marker === this.currentMarker) {
      this.currentMarker = null;
      this.currentMarkerPosition = undefined;
    }
  }

  async searchPlaces(keyword: string): Promise<MapSearchResult[]> {
    return await searchPlacesByWebAPI(keyword, this.apiKey);
  }

  async getAddressByCoordinates(lng: number, lat: number): Promise<MapLocation | null> {
    return await getAddressByCoordinates(lng, lat, this.apiKey);
  }

  displaySearchMarkers(results: MapSearchResult[], onClick: (index: number) => void): any[] {
    if (!this.mapInstance || !results.length) return [];

    const AMap = window.AMap;
    const markers: any[] = [];
    const positions: [number, number][] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.location.longitude && result.location.latitude) {
        const marker = new AMap.Marker({
          position: [result.location.longitude, result.location.latitude],
          title: result.name,
          content: `<div class="lf-map-marker-number">${i + 1}</div>`,
          anchor: 'center'
        });

        marker.on('click', () => onClick(i));
        this.mapInstance.add(marker);
        markers.push(marker);
        positions.push([result.location.longitude, result.location.latitude]);
      }
    }

    // 调整视图包含所有标记
    if (positions.length > 0) {
      try {
        this.mapInstance.setFitView(positions, false, [50, 50, 50, 50]);
      } catch (error) {
        console.warn('setFitView failed:', error);
        this.mapInstance.setCenter(positions[0]);
        this.mapInstance.setZoom(12);
      }
    }

    return markers;
  }

  clearMarkers(markers: any[]): void {
    if (!this.mapInstance) return;
    markers.forEach(marker => {
      if (marker) {
        this.mapInstance.remove(marker);
      }
    });
  }

  onMapClick(handler: (lng: number, lat: number) => void): void {
    if (!this.mapInstance) return;
    
    // 保存点击回调
    this.clickHandler = handler;
    
    this.mapInstance.on('click', (e: any) => {
      const { lng, lat } = e.lnglat;
      handler(lng, lat);
    });
  }

  async convertCoordinates(location: MapLocation): Promise<[number, number]> {
    if (!location.longitude || !location.latitude) {
      return [116.4074, 39.9042]; // 默认北京
    }

    const coordSystem = location.coordinate_system || 'WGS84';
    
    // 如果已经是GCJ-02，直接返回
    if (coordSystem.toLowerCase() === 'gcj-02' || coordSystem.toLowerCase() === 'gcj02') {
      return [location.longitude, location.latitude];
    }

    // 转换到GCJ-02
    try {
      return await AmapCoordinateConverter.convertToGcj02(
        location.longitude,
        location.latitude,
        coordSystem,
        this.apiKey
      );
    } catch (error) {
      console.warn('坐标转换失败:', error);
      return [location.longitude, location.latitude];
    }
  }

  getCoordinateSystem(): string {
    return 'GCJ-02';
  }

  /**
   * 添加自定义地图类型控件
   */
  private addCustomMapTypeControl(): void {
    if (!this.mapInstance || !window.AMap) return;

    // 创建控件容器
    const controlDiv = document.createElement('div');
    controlDiv.className = 'lf-custom-map-type-control lf-map-type-control-offset';
    controlDiv.innerHTML = t('map.satellite'); // 初始显示"卫星"，因为当前是地图图层
    
    // 使用简单的状态跟踪，避免复杂的图层检测
    let isCurrentlySatellite = false;
    
    // 添加点击事件
    controlDiv.addEventListener('click', () => {
      try {
        console.log('Map type control clicked, current state:', isCurrentlySatellite);
        
        if (isCurrentlySatellite) {
          // 当前是卫星图，切换到标准地图
          console.log('Switching to standard layer - recreating map');
          try {
            // 直接重渲染地图到标准样式
            const currentCenter = this.mapInstance!.getCenter();
            const currentZoom = this.mapInstance!.getZoom();
            const container = this.mapInstance!.getContainer();
            
            // 销毁当前地图
            this.mapInstance!.destroy();
            
            // 重新创建标准地图
            const AMap = window.AMap;
            this.mapInstance = new AMap.Map(container, {
              viewMode: '2D',
              zoom: currentZoom,
              center: currentCenter,
              mapStyle: 'amap://styles/normal', // 标准地图样式
              pitch: 0,
              rotateEnable: false,
              resizeEnable: true,
            });
            
            // 重新添加控件
            this.addCustomMapTypeControl();
            
            // 重新添加地图提供商切换控件（如果有多个可用提供商）
            if (this.availableProviders && this.availableProviders.length > 1) {
              this.addProviderSwitcherControl(this.availableProviders);
            }
            
            // 重新绑定点击事件
            if (this.clickHandler) {
              this.mapInstance.on('click', (e: any) => {
                const { lng, lat } = e.lnglat;
                this.clickHandler!(lng, lat);
              });
            }
            
            // 重新添加标记点
            if (this.currentMarkerPosition) {
              const { lng, lat, title } = this.currentMarkerPosition;
              const AMap = window.AMap;
              this.currentMarker = new AMap.Marker({
                position: [lng, lat],
                title: title || t('map.selectedLocation'),
                content: '<div class="lf-map-marker">📍</div>',
                anchor: 'bottom-center'
              });
              this.mapInstance.add(this.currentMarker);
            }
            
            console.log('Successfully switched to standard map by recreation');
          } catch (error) {
            console.error('Failed to recreate standard map:', error);
          }
          controlDiv.innerHTML = t('map.satellite'); // 切换到地图后，按钮显示"卫星"
          isCurrentlySatellite = false;
        } else {
          // 当前是标准地图，切换到卫星图
          console.log('Switching to satellite layer');
          try {
            // 方法1: 尝试使用图层方式（卫星图层的推荐方式）
            const currentLayers = this.mapInstance!.getLayers();
            console.log('Current layers before switch:', currentLayers);
            
            // 移除当前图层
            if (currentLayers && currentLayers.length > 0) {
              this.mapInstance!.remove(currentLayers);
            }
            
            // 添加卫星图层
            const satelliteLayer = new window.AMap.TileLayer.Satellite();
            this.mapInstance!.add(satelliteLayer);
            console.log('Successfully switched to satellite layer using TileLayer');
          } catch (error1) {
            console.log('TileLayer method failed, trying setMapStyle:', error1);
            try {
              // 方法2: 尝试使用 setMapStyle
              this.mapInstance!.setMapStyle('amap://styles/satellite');
              console.log('Successfully switched to satellite style');
            } catch (error2) {
              console.log('setMapStyle failed, trying setOptions:', error2);
              try {
                // 方法3: 尝试使用 setOptions
                this.mapInstance!.setOptions({
                  mapStyle: 'amap://styles/satellite'
                });
                console.log('Successfully switched using setOptions');
              } catch (error3) {
                console.error('All methods failed:', error3);
              }
            }
          }
          controlDiv.innerHTML = t('map.roadmap'); // 切换到卫星后，按钮显示"地图"
          isCurrentlySatellite = true;
        }
        
        console.log('New state:', isCurrentlySatellite);
      } catch (error) {
        console.error('Failed to switch map type:', error);
      }
    });

    // 直接将控件添加到地图容器
    try {
      const mapContainer = this.mapInstance.getContainer();
      if (mapContainer) {
        mapContainer.appendChild(controlDiv);
      }
    } catch (error) {
      console.error('Failed to add custom map type control:', error);
    }
  }

  /**
   * 添加地图提供商切换控件
   */
  private addProviderSwitcherControl(availableProviders: string[]): void {
    if (!this.mapInstance) return;

    // 创建控件容器
    const controlDiv = document.createElement('div');
    controlDiv.className = 'lf-provider-switcher-control';
    
    // 创建下拉选择框
    const select = document.createElement('select');
    select.className = 'lf-provider-select';
    
    // 添加选项
    availableProviders.forEach(provider => {
      const option = document.createElement('option');
      option.value = provider;
      option.textContent = provider === 'google' ? t('map.provider.google') : t('map.provider.gaode');
      option.selected = provider === 'gaode'; // 当前是高德地图
      select.appendChild(option);
    });
    
    // 添加切换事件
    select.addEventListener('change', (event) => {
      const target = event.target as HTMLSelectElement;
      const selectedProvider = target.value;
      
      console.log('Amap: Switching to provider:', selectedProvider);
      
      // 触发自定义事件，通知 MapSelector 切换提供商
      const switchEvent = new CustomEvent('mapProviderSwitch', {
        detail: { provider: selectedProvider }
      });
      window.dispatchEvent(switchEvent);
    });
    
    controlDiv.appendChild(select);
    
    // 直接将控件添加到地图容器（顶部居中）
    try {
      const mapContainer = this.mapInstance.getContainer();
      if (mapContainer) {
        mapContainer.appendChild(controlDiv);
      }
    } catch (error) {
      console.error('Failed to add provider switcher control:', error);
    }
  }

  destroy(): void {
    if (this.mapInstance) {
      this.mapInstance.destroy();
      this.mapInstance = null;
    }
    this.currentMarker = null;
  }
}

