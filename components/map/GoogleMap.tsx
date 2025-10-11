
import { MapLocation } from '../../types/map';

// Google Maps 配置工厂函数
export const createGoogleMapConfig = (googleMapsApiKey?: string) => ({
  key: googleMapsApiKey,
  center: { lat: 39.9042, lng: 116.4074 }, // 北京中心点
  zoom: 6, // 中国全境视图缩放级别
  mapTypeId: 'roadmap',
  mapId: 'LIFESET_LACOB_MAP'  // Map ID for AdvancedMarkerElement
});

// 坐标转换工具 - GCJ-02 到 WGS84
export class CoordinateConverter {
  /**
   * GCJ-02 转 WGS84
   * 使用迭代算法进行精确转换
   */
  public static gcj02ToWgs84(lng: number, lat: number): [number, number] {
    const a = 6378245.0; // 长半轴
    const ee = 0.00669342162296594323; // 扁率
    
    let dLat = this.transformLat(lng - 105.0, lat - 35.0);
    let dLng = this.transformLng(lng - 105.0, lat - 35.0);
    const radLat = (lat / 180.0) * Math.PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
    dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
    
    const wgsLat = lat - dLat;
    const wgsLng = lng - dLng;
    
    return [wgsLng, wgsLat];
  }

  /**
   * WGS84 转 GCJ-02
   */
  public static wgs84ToGcj02(lng: number, lat: number): [number, number] {
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    
    let dLat = this.transformLat(lng - 105.0, lat - 35.0);
    let dLng = this.transformLng(lng - 105.0, lat - 35.0);
    const radLat = (lat / 180.0) * Math.PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
    dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
    
    const gcjLat = lat + dLat;
    const gcjLng = lng + dLng;
    
    return [gcjLng, gcjLat];
  }

  private static transformLat(lng: number, lat: number): number {
    let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin(lat / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(lat / 12.0 * Math.PI) + 320 * Math.sin(lat * Math.PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }

  private static transformLng(lng: number, lat: number): number {
    let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin(lng / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(lng / 12.0 * Math.PI) + 300.0 * Math.sin(lng / 30.0 * Math.PI)) * 2.0 / 3.0;
    return ret;
  }

  /**
   * 通用坐标转换方法
   * @param lng 经度
   * @param lat 纬度  
   * @param fromSystem 源坐标系统
   * @returns Promise<[lng, lat]> 转换后的WGS84坐标
   */
  public static async convertToWgs84(lng: number, lat: number, fromSystem: string): Promise<[number, number]> {
    const coordSystemLower = (fromSystem || '').toLowerCase();
    
    // 如果已经是WGS84，直接返回
    if (coordSystemLower === 'wgs84' || coordSystemLower === 'gps' || coordSystemLower === 'wgs-84') {
      return [lng, lat];
    }
    
    // GCJ-02 转 WGS84
    if (coordSystemLower === 'gcj-02' || coordSystemLower === 'gcj02') {
      return this.gcj02ToWgs84(lng, lat);
    }
    
    console.warn(`Unsupported coordinate system: ${fromSystem}, returning original coordinates`);
    return [lng, lat];
  }
}

// 地图API加载器
export const loadGoogleMapsAPI = (apiKey?: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    // 检查是否已经加载
    if (window.google && window.google.maps) {
      resolve(window.google.maps);
      return;
    }

    if (!apiKey) {
      reject(new Error('Google Maps API key is required'));
      return;
    }

    // 动态加载 Google Maps API（加载 marker 和 places 库）
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__googleMapsCallback&loading=async&libraries=marker,places`;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';  // 添加 CORS 支持
    
    // 使用回调函数确保API加载完成
    (window as any).__googleMapsCallback = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
        delete (window as any).__googleMapsCallback;
      } else {
        reject(new Error('Google Maps API failed to load'));
      }
    };
    
    script.onerror = () => {
      delete (window as any).__googleMapsCallback;
      reject(new Error('Failed to load Google Maps API script'));
    };
    
    document.head.appendChild(script);
  });
};

// 使用新的 Places API (searchByText) 搜索地点
export const searchPlacesByGoogleAPI = async (keyword: string, apiKey: string, mapInstance?: any): Promise<any[]> => {
  console.log(`Searching for: "${keyword}"`);
  
  try {
    // 确保 Google Maps API 已加载
    if (!window.google || !window.google.maps) {
      await loadGoogleMapsAPI(apiKey);
    }

    // 使用新的 Place.searchByText API (无需临时地图)
    const { Place } = await (google.maps as any).importLibrary('places');
    
    // 构建请求参数
    const request: any = {
      textQuery: keyword,
      fields: ['displayName', 'formattedAddress', 'location'],
      maxResultCount: 10
    };

    // 如果有地图实例,使用当前视图范围作为搜索偏好
    if (mapInstance) {
      const bounds = mapInstance.getBounds();
      if (bounds) {
        // 使用当前地图视图范围作为 locationBias
        request.locationBias = bounds;
        console.log('  Using map viewport as location bias');
      } else {
        // 如果无法获取边界,使用地图中心作为偏好
        const center = mapInstance.getCenter();
        if (center) {
          request.locationBias = {
            center: { lat: center.lat(), lng: center.lng() },
            radius: 50000  // 50km 半径
          };
          console.log('  Using map center as location bias');
        }
      }
    }
    // 如果没有地图实例,不设置 locationBias,使用全球搜索

    const { places } = await Place.searchByText(request);
    
    if (places && places.length > 0) {
      const searchResults = places.map((place: any) => {
        const name = place.displayName || keyword;
        const address = place.formattedAddress || '';
        const location = place.location;
        
        return {
          name,
          address,
          location: {
            longitude: location.lng(),
            latitude: location.lat(),
            name,
            address,
            coordinate_system: 'WGS84'
          }
        };
      });
      
      console.log(`Found ${searchResults.length} results from Google Places (new API) for "${keyword}"`);
      return searchResults;
    } else {
      console.log(`No results found for "${keyword}"`);
      return [];
    }
  } catch (error) {
    console.error('Google Places API search error:', error);
    return [];
  }
};

// 逆地理编码功能（根据坐标获取地址信息）
export const getAddressByCoordinates = async (lng: number, lat: number, apiKey: string): Promise<MapLocation | null> => {
  try {
    // 确保 Google Maps API 已加载
    if (!window.google || !window.google.maps) {
      await loadGoogleMapsAPI(apiKey);
    }

    const geocoder = new google.maps.Geocoder();
    const latlng = { lat, lng };

    return new Promise((resolve) => {
      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const result = results[0];
          
          // 智能提取地点名称
          let name = '';
          
          // 策略1: 查找 POI 类型的组件（point_of_interest, establishment 等）
          if (result.address_components) {
            for (const component of result.address_components) {
              // 优先使用 POI、establishment、premise 等有意义的类型
              if (component.types.some((type: string) => 
                ['point_of_interest', 'establishment', 'premise', 'subpremise'].includes(type)
              )) {
                name = component.long_name;
                break;
              }
            }
          }
          
          // 策略2: 如果没有找到 POI，使用地区名称（neighborhood, locality, sublocality）
          if (!name && result.address_components) {
            for (const component of result.address_components) {
              if (component.types.some((type: string) => 
                ['neighborhood', 'sublocality', 'sublocality_level_1', 'locality'].includes(type)
              )) {
                name = component.long_name;
                break;
              }
            }
          }
          
          // 策略3: 使用格式化地址的第一部分（去掉门牌号）
          if (!name && result.formatted_address) {
            const parts = result.formatted_address.split(',');
            // 如果第一部分看起来像门牌号（纯数字或很短），使用第二部分
            const firstPart = parts[0]?.trim() || '';
            if (firstPart && !/^\d+$/.test(firstPart) && firstPart.length > 2) {
              name = firstPart;
            } else if (parts.length > 1) {
              name = parts[1]?.trim() || firstPart;
            } else {
              name = firstPart;
            }
          }

          console.log(`逆地理编码成功: ${lng}, ${lat} -> ${name} (${result.formatted_address})`);
          
          resolve({
            longitude: lng,
            latitude: lat,
            name: name || '选中位置',
            address: result.formatted_address || '',
            coordinate_system: 'WGS84'
          });
        } else {
          console.log(`逆地理编码失败: ${lng}, ${lat}`);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('逆地理编码失败:', error);
    return null;
  }
};

// IP定位功能（使用浏览器定位API）
export const getCurrentLocationByIP = async (): Promise<MapLocation | null> => {
  try {
    console.log('开始浏览器定位...');
    
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log('浏览器不支持定位，返回默认位置（北京）');
        resolve({
          longitude: 116.4074,
          latitude: 39.9042,
          name: '北京市',
          address: '北京市（默认位置）'
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('浏览器定位成功:', position.coords);
          resolve({
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
            name: '当前位置',
            address: '当前位置'
          });
        },
        (error) => {
          console.log('浏览器定位失败，返回默认位置（北京）:', error);
          resolve({
            longitude: 116.4074,
            latitude: 39.9042,
            name: '北京市',
            address: '北京市（默认位置）'
          });
        },
        {
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  } catch (error) {
    console.error('定位出错:', error);
    return null;
  }
};

