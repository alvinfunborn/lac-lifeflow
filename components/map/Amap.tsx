
import { MapLocation } from '../../types/map';

// 高德地图配置工厂函数
export const createAmapConfig = (gaodeWebServiceKey?: string) => ({
  key: gaodeWebServiceKey, // 使用Web服务密钥
  secret: "", // Web服务密钥不需要secret
  center: [116.4074, 39.9042] as [number, number], // 北京中心点
  zoom: 6, // 中国全境视图缩放级别
  mapStyle: "amap://styles/normal"
});

// 坐标转换工具 - 使用高德官方API
export class CoordinateConverter {

  /**
   * 通用坐标转换方法 - 使用高德Web API
   * @param lng 经度
   * @param lat 纬度  
   * @param fromSystem 源坐标系统
   * @param apiKey 高德Web服务API密钥
   * @returns Promise<[lng, lat]> 转换后的GCJ-02坐标
   */
  public static async convertToGcj02(lng: number, lat: number, fromSystem: string, apiKey: string): Promise<[number, number]> {
    try {
      // 如果已经是GCJ-02，直接返回
      const coordSystemLower = (fromSystem || '').toLowerCase();
      if (coordSystemLower === 'gcj-02' || coordSystemLower === 'gcj02') {
        return [lng, lat];
      }

      // 根据坐标系统确定转换类型
      let coordsys = 'gps'; // 默认GPS
      if (coordSystemLower === 'wgs84' || coordSystemLower === 'gps') {
        coordsys = 'gps';
      } else if (coordSystemLower === 'bd-09' || coordSystemLower === 'baidu') {
        coordsys = 'baidu';
      } else if (coordSystemLower === 'mapbar' || coordSystemLower === 'tuba') {
        coordsys = 'mapbar';
      }

      // 使用高德地图Web API进行坐标转换
      const response = await fetch(
        `https://restapi.amap.com/v3/assistant/coordinate/convert?key=${apiKey}&locations=${lng},${lat}&coordsys=${coordsys}`
      );
      const data = await response.json();

      if (data.status === '1' && data.locations && data.locations.length > 0) {
        const convertedCoord = data.locations[0].split(',').map(Number);
        console.log(`Web API coordinate conversion success: ${fromSystem} -> GCJ-02: ${lng}, ${lat} -> ${convertedCoord[0]}, ${convertedCoord[1]}`);
        return [convertedCoord[0], convertedCoord[1]];
      } else {
        console.warn(`Web API coordinate conversion failed for ${fromSystem}:`, data);
        return [lng, lat]; // Return original coordinates on failure
      }
    } catch (error) {
      console.warn(`Web API coordinate conversion failed for ${fromSystem}:`, error);
      return [lng, lat]; // Return original coordinates on error
    }
  }
}

// 尝试使用安全密钥
export const getSecurityKey = (apiKey: string): string => {
  // 如果API密钥配置了安全密钥，需要生成安全密钥
  // 这里暂时返回原始key，实际项目中应该在后端生成安全密钥
  return apiKey;
};

// 生成安全密钥
export const generateSecurityKey = (key: string, secret: string): string => {
  // 这里需要实现安全密钥生成逻辑
  // 由于这是前端代码，我们暂时使用key，实际项目中应该在后端生成
  return key;
};

// 地图API加载器
export const loadAMapAPI = (apiKey?: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    // 检查是否已经加载
    if (window.AMap) {
      resolve(window.AMap);
      return;
    }

    // 动态加载高德地图API（不包含插件，按需加载）
    const script = document.createElement('script');
    const securityKey = getSecurityKey(apiKey || '');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${securityKey}`;
    script.async = true;
    
    script.onload = () => {
      if (window.AMap) {
        // 设置地图图标路径，避免图片加载错误
        if (window.AMap.Icon && window.AMap.Icon.Default) {
          // 使用相对路径或禁用默认图标
          window.AMap.Icon.Default.imagePath = '';
        }
        resolve(window.AMap);
      } else {
        reject(new Error('AMap API failed to load'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load AMap API script'));
    };
    
    document.head.appendChild(script);
  });
};

// 搜索方案 - 仅使用高德地图API
export const searchPlacesByWebAPI = async (keyword: string, apiKey: string): Promise<any[]> => {
  console.log(`Searching for: "${keyword}"`);
  
  try {
    const searchParams = new URLSearchParams({
      key: apiKey,
      keywords: keyword,
      citylimit: 'false',  // 不限制城市范围，支持全球搜索
      output: 'json',
      extensions: 'all'
    });
    
    const response = await fetch(
      `https://restapi.amap.com/v3/place/text?${searchParams.toString()}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === '1' && data.pois && data.pois.length > 0) {
      const results = [];
      for (const poi of data.pois) {
        const gcjLng = parseFloat(poi.location.split(',')[0]);
        const gcjLat = parseFloat(poi.location.split(',')[1]);
        // 直接使用高德地图返回的坐标（GCJ-02）
        results.push({
          name: poi.name,
          address: poi.address,
          location: {
            longitude: gcjLng,
            latitude: gcjLat,
            name: poi.name,
            address: poi.address
          },
          distance: poi.distance
        });
      }
      console.log(`Found ${results.length} results from AMap for "${keyword}"`);
      return results;
    } else {
      console.log(`No results found for "${keyword}"`);
      return [];
    }
  } catch (error) {
    console.error('AMap API search error:', error);
    return [];
  }
};

// 逆地理编码功能（根据坐标获取地址信息）
export const getAddressByCoordinates = async (lng: number, lat: number, apiKey: string): Promise<MapLocation | null> => {
  try {
    const response = await fetch(
      `https://restapi.amap.com/v3/geocode/regeo?key=${apiKey}&location=${lng},${lat}&poitype=&radius=1000&extensions=all&batch=false&roadlevel=0`
    );
    const data = await response.json();
    
    if (data.status === '1' && data.regeocode) {
      const regeocode = data.regeocode;
      const addressComponent = regeocode.addressComponent;
      
      // 构建地址名称（优先使用POI名称，其次使用道路+门牌号）
      let name = '';
      if (regeocode.pois && regeocode.pois.length > 0) {
        // 如果有POI信息，使用POI名称
        name = regeocode.pois[0].name;
      } else if (regeocode.roads && regeocode.roads.length > 0) {
        // 如果没有POI，使用道路名称
        name = regeocode.roads[0].name;
      } else {
        // 最后使用区县+街道
        name = `${addressComponent.district || ''}${addressComponent.township || ''}`;
      }
      
      // 构建详细地址
      const address = regeocode.formatted_address || 
        `${addressComponent.province || ''}${addressComponent.city || ''}${addressComponent.district || ''}${addressComponent.township || ''}${addressComponent.neighborhood?.name || ''}`;
      
      console.log(`逆地理编码成功: ${lng}, ${lat} -> ${name} (${address})`);
      
      return {
        longitude: lng,
        latitude: lat,
        name: name || '选中位置',
        address: address,
        coordinate_system: 'GCJ-02'
      };
    }
    
    console.log(`逆地理编码失败: ${lng}, ${lat}`);
    return null;
  } catch (error) {
    console.error('逆地理编码失败:', error);
    return null;
  }
};

// IP定位功能（仅使用高德地图API）
// 通过IP地址获取地理位置
export const getLocationByIP = async (apiKey: string): Promise<MapLocation | null> => {
  try {
    const response = await fetch(
      `https://restapi.amap.com/v3/ip?key=${apiKey}`
    );
    const data = await response.json();
    
    if (data.status === '1' && data.location) {
      const [longitude, latitude] = data.location.split(',').map(Number);
      
      return {
        longitude,
        latitude,
        name: `${data.province}${data.city}`,
        address: `${data.province}${data.city}${data.district || ''}`
      };
    }
    
    return null;
  } catch (error) {
    console.error('IP定位失败:', error);
    return null;
  }
};

// 获取当前位置（通过IP定位）
export const getCurrentLocationByIP = async (apiKey: string): Promise<MapLocation | null> => {
  try {
    console.log('开始IP定位...');
    const location = await getLocationByIP(apiKey);
    
    if (location) {
      console.log('IP定位成功:', location);
      return location;
    } else {
      console.log('IP定位失败，返回默认位置（北京）');
      return {
        longitude: 116.4074,
        latitude: 39.9042,
        name: '北京市',
        address: '北京市（默认位置）'
      };
    }
  } catch (error) {
    console.error('IP定位出错:', error);
    return null;
  }
};

