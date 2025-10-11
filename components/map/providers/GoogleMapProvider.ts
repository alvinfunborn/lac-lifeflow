/// <reference path="../../../types/shims.d.ts" />
import { IMapProvider } from './IMapProvider';
import { MapLocation, MapSearchResult } from '../../../types/map';
import { 
  loadGoogleMapsAPI, 
  searchPlacesByGoogleAPI, 
  getAddressByCoordinates, 
  createGoogleMapConfig,
  CoordinateConverter
} from '../GoogleMap';
import { t } from '../../../i18n';

declare const google: any;

/**
 * Google Maps 提供商实现
 */
export class GoogleMapProvider implements IMapProvider {
  private apiKey: string;
  private language: 'zh' | 'en';
  private mapInstance: any = null;
  private currentMarker: any = null;
  private containerElement: HTMLElement | null = null;
  private eventListeners: Array<{ type: string; handler: EventListener; options?: any }> = [];

  constructor(apiKey: string, language: 'zh' | 'en' = 'en') {
    this.apiKey = apiKey;
    this.language = language;
  }

  async initMap(container: HTMLElement, initialLocation?: MapLocation, availableProviders?: string[]): Promise<void> {
    await loadGoogleMapsAPI(this.apiKey, this.language);
    const config = createGoogleMapConfig(this.apiKey);
    
    // 保存容器引用
    this.containerElement = container;
    
    // 为谷歌地图容器添加事件阻止，防止触发 Obsidian 手势
    const stopPropagation = (e: Event) => e.stopPropagation();
    const addListener = (type: string, handler: EventListener, options?: any) => {
      container.addEventListener(type, handler, options);
      this.eventListeners.push({ type, handler, options });
    };
    
    addListener('touchstart', stopPropagation, { passive: false });
    addListener('touchmove', stopPropagation, { passive: false });
    addListener('touchend', stopPropagation, { passive: false });
    addListener('mousedown', stopPropagation);
    addListener('mousemove', stopPropagation);
    addListener('mouseup', stopPropagation);
    addListener('wheel', stopPropagation, { passive: false });
    
    this.mapInstance = new google.maps.Map(container, {
      center: config.center,
      zoom: config.zoom,
      mapTypeId: config.mapTypeId,
      mapId: config.mapId,  // Map ID for AdvancedMarkerElement
      // 禁用被遮挡的控件
      streetViewControl: false,     // 隐藏街景小人
      fullscreenControl: false,     // 隐藏全屏按钮
      zoomControl: false,           // 隐藏缩放按钮
      rotateControl: false,         // 隐藏旋转控件
      tilt: 0,                      // 禁用地图倾斜
      // 禁用默认的地图类型控件
      mapTypeControl: false,
      // 启用比例尺
      scaleControl: true,
      scaleControlOptions: {
        position: google.maps.ControlPosition.BOTTOM_LEFT
      }
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
  }

  setCenter(lng: number, lat: number, zoom?: number): void {
    if (!this.mapInstance) return;
    this.mapInstance.setCenter({ lat, lng });
    if (zoom !== undefined) {
      this.mapInstance.setZoom(zoom);
    }
  }

  addMarker(lng: number, lat: number, title?: string): any {
    if (!this.mapInstance) return null;
    
    // 优先使用 AdvancedMarkerElement (需要 marker 库和 mapId)
    if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat, lng },
        map: this.mapInstance,
        title: title || t('map.selectedLocation')
      });
      return marker;
    }
    
    // 回退到经典 Marker
    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: this.mapInstance,
      title: title || t('map.selectedLocation')
    });
    
    return marker;
  }

  removeMarker(marker: any): void {
    if (!marker) return;
    marker.setMap(null);
  }

  async searchPlaces(keyword: string): Promise<MapSearchResult[]> {
    return await searchPlacesByGoogleAPI(keyword, this.apiKey, this.mapInstance);
  }

  async getAddressByCoordinates(lng: number, lat: number): Promise<MapLocation | null> {
    return await getAddressByCoordinates(lng, lat, this.apiKey);
  }

  displaySearchMarkers(results: MapSearchResult[], onClick: (index: number) => void): any[] {
    if (!this.mapInstance || !results.length) return [];

    const markers: any[] = [];
    const bounds: any[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.location.longitude && result.location.latitude) {
        let marker: any;
        
        // 优先使用 AdvancedMarkerElement
        if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
          // 创建数字标签元素
          const labelDiv = document.createElement('div');
          labelDiv.className = 'lf-map-marker-number';
          labelDiv.textContent = String(i + 1);
          
          marker = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: result.location.latitude, lng: result.location.longitude },
            map: this.mapInstance,
            title: result.name,
            content: labelDiv
          });
          
          marker.addListener('click', () => onClick(i));
        } else {
          // 回退到经典 Marker
          marker = new google.maps.Marker({
            position: { lat: result.location.latitude, lng: result.location.longitude },
            map: this.mapInstance,
            title: result.name,
            label: {
              text: String(i + 1),
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold'
            }
          });
          
          marker.addListener('click', () => onClick(i));
        }

        markers.push(marker);
        bounds.push(new google.maps.LatLng(result.location.latitude, result.location.longitude));
      }
    }

    // 调整视图包含所有标记
    if (bounds.length > 0) {
      const mapBounds = new google.maps.LatLngBounds();
      bounds.forEach((pos: any) => mapBounds.extend(pos));
      this.mapInstance.fitBounds(mapBounds);
    }

    return markers;
  }

  clearMarkers(markers: any[]): void {
    markers.forEach(marker => {
      if (marker) {
        marker.setMap(null);
      }
    });
  }

  onMapClick(handler: (lng: number, lat: number) => void): void {
    if (!this.mapInstance) return;
    
    this.mapInstance.addListener('click', (e: any) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        handler(lng, lat);
      }
    });
  }

  async convertCoordinates(location: MapLocation): Promise<[number, number]> {
    if (!location.longitude || !location.latitude) {
      return [116.4074, 39.9042]; // 默认北京
    }

    const coordSystem = location.coordinate_system || 'WGS84';
    
    // 如果已经是WGS84，直接返回
    if (coordSystem.toLowerCase() === 'wgs84' || coordSystem.toLowerCase() === 'gps') {
      return [location.longitude, location.latitude];
    }

    // 如果是GCJ-02，转换到WGS84
    if (coordSystem.toLowerCase() === 'gcj-02' || coordSystem.toLowerCase() === 'gcj02') {
      const [lng, lat] = CoordinateConverter.gcj02ToWgs84(location.longitude, location.latitude);
      return [lng, lat];
    }

    // 其他坐标系统
    return await CoordinateConverter.convertToWgs84(
      location.longitude,
      location.latitude,
      coordSystem
    );
  }

  getCoordinateSystem(): string {
    return 'WGS84';
  }

  /**
   * 添加自定义地图类型控件
   * 参考：https://developers.google.com/maps/documentation/javascript/controls?hl=zh-cn#maps_control_disableUI-javascript
   */
  private addCustomMapTypeControl(): void {
    if (!this.mapInstance) return;

    // 创建控件容器
    const controlDiv = document.createElement('div');
    controlDiv.className = 'lf-custom-map-type-control';
    controlDiv.innerHTML = t('map.satellite'); // 初始显示"卫星"，因为当前是地图图层
    
    // 添加点击事件
    controlDiv.addEventListener('click', () => {
      const currentMapType = this.mapInstance!.getMapTypeId();
      const newMapType = currentMapType === 'roadmap' ? 'satellite' : 'roadmap';
      this.mapInstance!.setMapTypeId(newMapType);
      // 按钮显示的是点击后将要切换到的图层类型
      controlDiv.innerHTML = newMapType === 'roadmap' ? t('map.satellite') : t('map.roadmap');
    });

    // 将控件添加到地图的 RIGHT_BOTTOM 位置（右侧靠下），并向上偏移
    controlDiv.classList.add('lf-map-type-control-offset');
    this.mapInstance.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(controlDiv);
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
      option.selected = provider === 'google'; // 当前是 Google Maps
      select.appendChild(option);
    });
    
    // 添加切换事件
    select.addEventListener('change', (event) => {
      const target = event.target as HTMLSelectElement;
      const selectedProvider = target.value;
      
      console.log('Google Maps: Switching to provider:', selectedProvider);
      
      // 触发自定义事件，通知 MapSelector 切换提供商
      const switchEvent = new CustomEvent('mapProviderSwitch', {
        detail: { provider: selectedProvider }
      });
      window.dispatchEvent(switchEvent);
    });
    
    controlDiv.appendChild(select);
    
    // 将控件添加到地图的 TOP_CENTER 位置（顶部居中）
    this.mapInstance.controls[google.maps.ControlPosition.TOP_CENTER].push(controlDiv);
  }

  destroy(): void {
    // 清理事件监听器
    if (this.containerElement) {
      this.eventListeners.forEach(({ type, handler, options }) => {
        this.containerElement!.removeEventListener(type, handler, options);
      });
      this.eventListeners = [];
      this.containerElement = null;
    }
    
    // Google Maps 不需要显式销毁
    this.mapInstance = null;
    this.currentMarker = null;
  }
}

