import React, { useState, useEffect, useRef } from 'react';
import { MapSelectorProps, MapLocation, MapSearchResult } from '../../types/map';
import { MapProviderFactory } from './providers/MapProviderFactory';
import { IMapProvider } from './providers/IMapProvider';
import { t } from '../../i18n';

export default function MapSelector({
  visible,
  initialLocation,
  onCancel,
  onConfirm,
  title = t('map.title'),
  placeholder = t('map.placeholder'),
  settings,
  updateSettings
}: MapSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MapSearchResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(initialLocation || null);
  const [userSelectedNewLocation, setUserSelectedNewLocation] = useState(false); // 追踪用户是否选择了新地点
  const [isSearching, setIsSearching] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchError, setSearchError] = useState<string>('');
  const [currentProvider, setCurrentProvider] = useState<string>(settings.mapApiProvider);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<IMapProvider | null>(null);
  const currentMarkerRef = useRef<any>(null);
  const searchMarkersRef = useRef<any[]>([]);
  const searchResultsRef = useRef<HTMLDivElement | null>(null);
  const userSelectedNewLocationRef = useRef<boolean>(false);  // 使用 ref 保持最新值
  const selectedLocationRef = useRef<MapLocation | null>(initialLocation || null);  // 使用 ref 保持最新值

  // 初始化搜索查询
  useEffect(() => {
    if (initialLocation) {
      setSearchQuery(initialLocation.name || initialLocation.address || '');
    }
  }, [initialLocation]);

  // 初始化地图
  useEffect(() => {
    if (!visible || settings.mapApiProvider === 'none') return;

    const initMap = async () => {
      try {
        // 获取 API Key
        const apiKey = settings.mapApiProvider === 'google' 
          ? settings.googleMapsApiKey 
          : settings.gaodeWebServiceKey;

        if (!apiKey) {
          console.warn('No API key provided for map provider:', settings.mapApiProvider);
          return;
        }

        // 检测可用的地图提供商
        const availableProviders: string[] = [];
        if (settings.gaodeWebServiceKey) availableProviders.push('gaode');
        if (settings.googleMapsApiKey) availableProviders.push('google');
        
        console.log('MapSelector: Available providers:', availableProviders);

        // 创建地图提供商实例
        const provider = MapProviderFactory.createProvider(settings.mapApiProvider, apiKey);
        providerRef.current = provider;

        // 初始化地图
        if (mapContainerRef.current) {
          await provider.initMap(mapContainerRef.current, initialLocation, availableProviders);
          
          // 绑定地图点击事件
          provider.onMapClick(handleMapClick);

          setMapLoaded(true);
        }
        
        // 设置当前提供商状态
        setCurrentProvider(settings.mapApiProvider);
      } catch (error) {
        console.error('Map initialization failed:', error);
      }
    };

    initMap();

    // 清理函数
    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      currentMarkerRef.current = null;
      searchMarkersRef.current = [];
    };
  }, [visible, settings.mapApiProvider, initialLocation]);

  // 监听地图提供商切换事件
  useEffect(() => {
    const handleProviderSwitch = async (event: CustomEvent) => {
      const { provider: newProvider } = event.detail;
      
      console.log('MapSelector: Received switch event:', newProvider, 'current:', currentProvider);
      
      if (newProvider === currentProvider) {
        console.log('MapSelector: Same provider, skipping switch');
        return; // 已经是当前提供商，无需切换
      }

      try {
        console.log('🔄 MapSelector: Starting provider switch...');
        console.log('  userSelectedNewLocation (state):', userSelectedNewLocation);
        console.log('  userSelectedNewLocation (ref):', userSelectedNewLocationRef.current);
        console.log('  selectedLocation (state):', selectedLocation);
        console.log('  selectedLocation (ref):', selectedLocationRef.current);
        console.log('  initialLocation:', initialLocation);
        
        // 清除搜索结果和搜索标记
        setSearchResults([]);
        setSearchError('');
        if (providerRef.current && searchMarkersRef.current.length > 0) {
          providerRef.current.clearMarkers(searchMarkersRef.current);
          searchMarkersRef.current = [];
        }
        
        // 销毁当前地图
        if (providerRef.current) {
          providerRef.current.destroy();
          providerRef.current = null;
        }

        // 清空地图容器
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML = '';
        }

        // 注意：不更新插件设置，只是临时切换地图提供商
        // 下次打开地图选择器时，仍然使用设置中的默认地图提供商

        // 重新初始化地图
        const apiKey = newProvider === 'google' 
          ? settings.googleMapsApiKey 
          : settings.gaodeWebServiceKey;

        if (!apiKey) {
          console.warn('No API key provided for new map provider:', newProvider);
          return;
        }

        const availableProviders: string[] = [];
        if (settings.gaodeWebServiceKey) availableProviders.push('gaode');
        if (settings.googleMapsApiKey) availableProviders.push('google');

        console.log('MapSelector: Switching to provider:', newProvider, 'available:', availableProviders);

        const provider = MapProviderFactory.createProvider(newProvider, apiKey);
        providerRef.current = provider;

        if (mapContainerRef.current) {
          // 如果用户选择了新地点（点击地图或选择搜索结果），使用 selectedLocation
          // 否则使用原始的 initialLocation（避免坐标转换导致的精度损失）
          // 使用 ref 的值来避免闭包问题
          const locationToUse = userSelectedNewLocationRef.current 
            ? (selectedLocationRef.current || undefined) 
            : initialLocation;
          console.log('📍 MapSelector: Location to use:', locationToUse);
          console.log('  Reason:', userSelectedNewLocationRef.current ? 'User selected new location' : 'Using initial location');
          
          await provider.initMap(mapContainerRef.current, locationToUse, availableProviders);
          provider.onMapClick(handleMapClick);
          
          // 如果有位置，重新添加标记
          if (locationToUse && locationToUse.longitude && locationToUse.latitude) {
            const [lng, lat] = await provider.convertCoordinates(locationToUse);
            currentMarkerRef.current = provider.addMarker(lng, lat, locationToUse.name);
          }
          
          setMapLoaded(true);
        }
        
        // 更新当前提供商状态
        setCurrentProvider(newProvider);
      } catch (error) {
        console.error('Failed to switch map provider:', error);
      }
    };

    window.addEventListener('mapProviderSwitch', handleProviderSwitch as unknown as EventListener);

    return () => {
      window.removeEventListener('mapProviderSwitch', handleProviderSwitch as unknown as EventListener);
    };
  }, [currentProvider, settings.mapApiProvider, settings.googleMapsApiKey, settings.gaodeWebServiceKey, initialLocation]);

  // 地图点击处理
  const handleMapClick = async (lng: number, lat: number) => {
    if (!providerRef.current) return;

    try {
      console.log('🖱️ MapSelector: Map clicked at:', lng, lat);
      
      // 使用逆地理编码获取地址信息
      const location = await providerRef.current.getAddressByCoordinates(lng, lat);
      
      if (location) {
        setSelectedLocation(location);
        selectedLocationRef.current = location;  // 同步更新 ref
        setSearchQuery(location.name || t('map.selectedLocation'));
        console.log('  ✅ Location set:', location);
      } else {
        const defaultLocation: MapLocation = {
          longitude: lng,
          latitude: lat,
          name: t('map.selectedLocation')
        };
        setSelectedLocation(defaultLocation);
        selectedLocationRef.current = defaultLocation;  // 同步更新 ref
        setSearchQuery(t('map.selectedLocation'));
        console.log('  ✅ Default location set:', defaultLocation);
      }
      
      // 标记用户已选择新地点
      setUserSelectedNewLocation(true);
      userSelectedNewLocationRef.current = true;  // 同步更新 ref
      console.log('  ✅ userSelectedNewLocation set to true');
      
      setSearchResults([]);

      // 更新标记
      if (currentMarkerRef.current) {
        providerRef.current.removeMarker(currentMarkerRef.current);
      }
      currentMarkerRef.current = providerRef.current.addMarker(lng, lat, location?.name);
    } catch (error) {
      console.error('Failed to get address:', error);
    }
  };

  // 搜索地点
  const handleSearch = async () => {
    if (!searchQuery.trim() || !providerRef.current) return;

    setIsSearching(true);
    setSearchError('');
    
    try {
      const results = await providerRef.current.searchPlaces(searchQuery);
      
      if (results && results.length > 0) {
        setSearchResults(results);
        
        // 清除之前的搜索结果标记
        if (searchMarkersRef.current.length > 0) {
          providerRef.current.clearMarkers(searchMarkersRef.current);
          searchMarkersRef.current = [];
        }
        
        // 显示搜索结果标记
        searchMarkersRef.current = providerRef.current.displaySearchMarkers(
          results,
          scrollToSearchResult
        );
      } else {
        setSearchResults([]);
        setSearchError(t('map.noResults'));
        
        // 清除搜索结果标记
        if (searchMarkersRef.current.length > 0 && providerRef.current) {
          providerRef.current.clearMarkers(searchMarkersRef.current);
          searchMarkersRef.current = [];
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError(t('map.searchFailed'));
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 滚动到指定的搜索结果
  const scrollToSearchResult = (index: number) => {
    if (searchResultsRef.current) {
      const resultItems = searchResultsRef.current.querySelectorAll('.lf-map-search-result');
      if (resultItems[index]) {
        resultItems[index].scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        
        // 添加高亮效果
        resultItems.forEach((item, i) => {
          const numberElement = item.querySelector('.lf-map-search-result-number');
          if (numberElement) {
            numberElement.classList.remove('lf-map-search-result-highlight');
            if (i === index) {
              numberElement.classList.add('lf-map-search-result-highlight');
              setTimeout(() => {
                numberElement.classList.remove('lf-map-search-result-highlight');
              }, 2000);
            }
          }
        });
      }
    }
  };

  // 选择搜索结果
  const handleSelectResult = async (result: MapSearchResult) => {
    if (!providerRef.current) return;

    console.log('🔍 MapSelector: Search result selected:', result);
    
    setSelectedLocation(result.location);
    selectedLocationRef.current = result.location;  // 同步更新 ref
    setSearchQuery(result.name);
    setSearchResults([]);
    
    // 标记用户已选择新地点
    setUserSelectedNewLocation(true);
    userSelectedNewLocationRef.current = true;  // 同步更新 ref
    console.log('  ✅ userSelectedNewLocation set to true');
    
    // 清除搜索结果标记
    if (searchMarkersRef.current.length > 0) {
      providerRef.current.clearMarkers(searchMarkersRef.current);
      searchMarkersRef.current = [];
    }
    
    // 移动地图到选中位置并添加标记
    if (result.location.longitude && result.location.latitude) {
      const [lng, lat] = await providerRef.current.convertCoordinates(result.location);
      providerRef.current.setCenter(lng, lat, 15);
      
      // 更新选中标记
      if (currentMarkerRef.current) {
        providerRef.current.removeMarker(currentMarkerRef.current);
      }
      currentMarkerRef.current = providerRef.current.addMarker(lng, lat, result.name);
    }
  };

  // 确认选择
  const handleConfirm = () => {
    // 情况1: 如果搜索输入框为空，清除地址数据
    if (!searchQuery.trim()) {
      const emptyLocation: MapLocation = {
        name: '',
        longitude: undefined,
        latitude: undefined,
        address: ''
      };
      onConfirm(emptyLocation);
      return;
    }

    // 情况2: 如果选择了地址且搜索输入框显示该地址名称，保存完整地址信息
    if (selectedLocation && 
        selectedLocation.name && 
        searchQuery.trim() === selectedLocation.name) {
      const coordSystem = providerRef.current?.getCoordinateSystem() || 'WGS84';
      const locationWithCoordSystem: MapLocation = {
        ...selectedLocation,
        coordinate_system: coordSystem
      };
      onConfirm(locationWithCoordSystem);
      return;
    }

    // 情况3: 其他情况（只输入了搜索内容，或选择了地址但搜索框内容不匹配）
    const textLocation: MapLocation = {
      name: searchQuery.trim(),
      longitude: undefined,
      latitude: undefined,
      address: undefined,
      coordinate_system: undefined
    };
    onConfirm(textLocation);
  };

  // 关闭搜索结果
  const handleCloseSearchResults = () => {
    setSearchResults([]);
    setSearchQuery('');
    setSelectedLocation(null);
    
    // 清除地图上的标记
    if (providerRef.current) {
      if (searchMarkersRef.current.length > 0) {
        providerRef.current.clearMarkers(searchMarkersRef.current);
        searchMarkersRef.current = [];
      }
      
      if (currentMarkerRef.current) {
        providerRef.current.removeMarker(currentMarkerRef.current);
        currentMarkerRef.current = null;
      }
    }
  };

  // 键盘事件处理
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!visible) return null;

  return (
    <div className="lf-map-selector-mask" onClick={(e) => { if (e.currentTarget === e.target) onCancel(); }}>
      <div className="lf-map-selector" onClick={(e) => e.stopPropagation()}>
        
        {/* 地图层作为背景 */}
        <div className="lf-map-background">
          <div 
            ref={mapContainerRef} 
            className="lf-map-canvas"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          />
          {!mapLoaded && (
            <div className="lf-map-loading">
              <div className="lf-map-loading-text">{t('map.loading')}</div>
            </div>
          )}
        </div>

        {/* 顶部搜索区域 */}
        <div className="lf-map-top-controls">
          {/* 搜索框 */}
          <div className="lf-map-search">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              className="lf-map-search-input"
            />
            {searchResults.length > 0 ? (
              <button 
                onClick={handleCloseSearchResults}
                className="lf-map-search-btn lf-map-clear-btn"
                title={t('map.closeResults')}
              />
            ) : (
              <button 
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="lf-map-search-btn"
                title={isSearching ? t('map.searching') : t('map.search')}
              />
            )}
          </div>

          {/* 搜索错误提示 */}
          {searchError && (
            <div className="lf-map-search-error">
              {searchError}
            </div>
          )}

          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <div 
              ref={searchResultsRef}
              className="lf-map-search-results"
              onClick={(e) => e.stopPropagation()}
            >
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className="lf-map-search-result"
                  onClick={() => handleSelectResult(result)}
                >
                  <div className="lf-map-search-result-number">{index + 1}</div>
                  <div className="lf-map-search-result-content">
                    <div className="lf-map-search-result-name">{result.name}</div>
                    <div className="lf-map-search-result-address">{result.address}</div>
                    {result.distance && (
                      <div className="lf-map-search-result-distance">{result.distance}m</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部操作按钮 */}
        <div className="lf-map-bottom-controls">
          <button className="lf-btn lf-btn-cancel" onClick={onCancel}>
            {t('map.cancel')}
          </button>
          <button 
            className="lf-btn lf-btn-confirm" 
            onClick={handleConfirm}
          >
            {t('map.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
