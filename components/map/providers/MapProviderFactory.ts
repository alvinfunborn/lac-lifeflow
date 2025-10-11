import { IMapProvider } from './IMapProvider';
import { AmapProvider } from './AmapProvider';
import { GoogleMapProvider } from './GoogleMapProvider';

/**
 * 地图提供商工厂类
 * 根据类型创建对应的地图提供商实例
 */
export class MapProviderFactory {
  /**
   * 创建地图提供商实例
   * @param type 地图类型
   * @param apiKey API 密钥
   * @returns 地图提供商实例
   */
  static createProvider(type: 'gaode' | 'google', apiKey: string): IMapProvider {
    switch (type) {
      case 'gaode':
        return new AmapProvider(apiKey);
      case 'google':
        return new GoogleMapProvider(apiKey);
      default:
        throw new Error(`Unsupported map provider: ${type}`);
    }
  }
}

