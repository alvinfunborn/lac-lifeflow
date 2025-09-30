import React, { useState, useEffect, useRef } from 'react';
import { MapSelectorProps, MapLocation, MapSearchResult, AMapLocation, AMapSearchResult } from '../../types/map';
import { LifeFlowSettings } from '../../types';
import { loadAMapAPI, searchPlacesByWebAPI, createAmapConfig } from './Amap';

export default function MapSelector({
  visible,
  initialLocation,
  onCancel,
  onConfirm,
  title = '选择地点',
  placeholder = '搜索地点...',
  settings
}: MapSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MapSearchResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(initialLocation || null);
  const [isSearching, setIsSearching] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchError, setSearchError] = useState<string>('');
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(createAmapConfig(settings.gaodeWebServiceKey).zoom);

  // Initialize search query with initial location
  useEffect(() => {
    if (initialLocation) {
      setSearchQuery(initialLocation.name || initialLocation.address || '');
      
      // 如果有坐标信息，设置初始地图中心点
      if (initialLocation.longitude && initialLocation.latitude) {
        const coordSystem = initialLocation.coordinate_system || 'WGS84'; // 默认WGS84
        
        // 如果已经是GCJ-02，直接设置
        if (coordSystem.toLowerCase() === 'gcj-02' || coordSystem.toLowerCase() === 'gcj02') {
          setMapCenter([initialLocation.longitude!, initialLocation.latitude!]);
          setMapZoom(16);
        } else {
          // 其他坐标系统需要转换，但先设置原坐标作为初始值
          setMapCenter([initialLocation.longitude!, initialLocation.latitude!]);
          setMapZoom(16);
        }
      }
    }
  }, [initialLocation]);
  
  // 当坐标转换完成后，更新地图中心点
  useEffect(() => {
    if (mapInstanceRef.current && mapCenter) {
      mapInstanceRef.current.setCenter(mapCenter);
      if (mapZoom !== createAmapConfig(settings.gaodeWebServiceKey).zoom) {
        mapInstanceRef.current.setZoom(mapZoom);
      }
    }
  }, [mapCenter, mapZoom]);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const searchResultMarkersRef = useRef<any[]>([]);
  const searchInstanceRef = useRef<any>(null);
  const hasSearchResultsRef = useRef(false);
  const searchResultsRef = useRef<HTMLDivElement | null>(null);

  // 初始化地图
  useEffect(() => {
    if (!visible) return;

    const initMap = async () => {
      try {
        const AMap = await loadAMapAPI(settings.gaodeWebServiceKey);
        if (mapContainerRef.current) {
          // 创建地图实例
          const amapConfig = createAmapConfig(settings.gaodeWebServiceKey);
          let mapCenter = amapConfig.center;
          let mapZoom = amapConfig.zoom;
          
          // 坐标转换已在useEffect中处理，这里直接使用mapCenter和mapZoom状态
          
          const map = new AMap.Map(mapContainerRef.current, {
            viewMode: '2D',
            zoom: mapZoom,
            center: mapCenter,
            mapStyle: amapConfig.mapStyle,
            // 确保地图填满容器
            resizeEnable: true
          });

          mapInstanceRef.current = map;
          
          // 地图加载完成后，如果有初始位置且需要坐标转换，进行转换
          if (initialLocation && initialLocation.longitude && initialLocation.latitude) {
            const coordSystem = initialLocation.coordinate_system || 'WGS84';
            
            // 如果不是GCJ-02，需要转换坐标
            if (coordSystem.toLowerCase() !== 'gcj-02' && coordSystem.toLowerCase() !== 'gcj02') {
              import('../../components/map/Amap').then(({ CoordinateConverter }) => {
                CoordinateConverter.convertToGcj02(
                  initialLocation.longitude!, 
                  initialLocation.latitude!, 
                  coordSystem,
                  settings.gaodeWebServiceKey || ''
                ).then(([gcjLng, gcjLat]) => {
                  console.log(`坐标转换成功: ${initialLocation.longitude}, ${initialLocation.latitude} -> ${gcjLng}, ${gcjLat}`);
                  // 更新地图中心点
                  map.setCenter([gcjLng, gcjLat]);
                  map.setZoom(16);
                  
                  // 更新标记位置
                  if (markerRef.current) {
                    markerRef.current.setPosition([gcjLng, gcjLat]);
                  }
                }).catch((error) => {
                  console.warn('坐标转换失败，使用原坐标:', error);
                });
              });
            }
          }
          
          // 强制地图调整大小以填满容器
          setTimeout(() => {
            if (mapInstanceRef.current && mapContainerRef.current) {
              // 获取容器的实际尺寸
              const containerRect = mapContainerRef.current.getBoundingClientRect();
              console.log('Container size:', containerRect.width, 'x', containerRect.height);
              
              // 强制地图调整大小
              mapInstanceRef.current.getSize();
              
              // 手动设置地图容器大小
              const mapContainer = mapContainerRef.current.querySelector('.amap-container') as HTMLElement;
              if (mapContainer) {
                mapContainer.style.width = containerRect.width + 'px';
                mapContainer.style.height = containerRect.height + 'px';
              }
              
              // 触发地图重新渲染
              mapInstanceRef.current.getSize();
            }
          }, 200);
          
          // 不再使用PlaceSearch插件，改用Web API搜索

          // 创建标记
          if (initialLocation && initialLocation.longitude && initialLocation.latitude) {
            // 先使用原坐标创建标记，如果需要转换会在后面更新
            const marker = new AMap.Marker({
              position: [initialLocation.longitude, initialLocation.latitude],
              title: initialLocation.name || '选中位置',
              content: '<div style="background: transparent; color: red; font-size: 20px; display: flex; align-items: center; justify-content: center; padding-bottom: 0; margin-bottom: -5px;">📍</div>',
              anchor: 'bottom-center'
            });
            map.add(marker);
            markerRef.current = marker;
          }

          // 地图交互事件 - 不再自动关闭搜索列表

          // 地图点击事件
          map.on('click', async (e: any) => {
            const { lng, lat } = e.lnglat;
            
            // 使用逆地理编码获取地址信息
            import('./Amap').then(({ getAddressByCoordinates }) => {
              getAddressByCoordinates(lng, lat, settings.gaodeWebServiceKey || '').then((location) => {
                if (location) {
                  // 更新选中位置和搜索输入框
                  setSelectedLocation(location);
                  setSearchQuery(location.name || '选中位置');
                  
                  // 关闭搜索结果列表
                  setSearchResults([]);
                  
                  console.log('地图点击获取地址:', location);
                } else {
                  // 如果逆地理编码失败，使用默认信息
                  const defaultLocation: MapLocation = {
                    longitude: lng,
                    latitude: lat,
                    name: '选中位置'
                  };
                  setSelectedLocation(defaultLocation);
                  setSearchQuery('选中位置');
                  setSearchResults([]);
                }
              });
            });
            
            // 更新标记
            if (markerRef.current) {
              markerRef.current.setPosition([lng, lat]);
            } else {
              const marker = new AMap.Marker({
                position: [lng, lat],
                title: '选中位置',
                content: '<div style="background: transparent; color: red; font-size: 20px; display: flex; align-items: center; justify-content: center; padding-bottom: 0; margin-bottom: -5px;">📍</div>',
                anchor: 'bottom-center'
              });
              map.add(marker);
              markerRef.current = marker;
            }
          });

          // 地图交互事件 - 不再自动关闭搜索结果列表

          setMapLoaded(true);
        }
      } catch (error) {
        // Map initialization failed silently
      }
    };

    initMap();

    // 清理函数
    return () => {
      if (mapInstanceRef.current) {
        // 清除搜索结果标记
        searchResultMarkersRef.current.forEach(marker => {
          if (marker) {
            mapInstanceRef.current.remove(marker);
          }
        });
        searchResultMarkersRef.current = [];
        
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current = null;
      }
      if (searchInstanceRef.current) {
        searchInstanceRef.current = null;
      }
    };
  }, [visible, initialLocation]);

  // 搜索地点 - 使用备用Web API方案
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');
    
    try {
      // 使用Web API进行搜索
      const results = await searchPlacesByWebAPI(searchQuery, settings.gaodeWebServiceKey || '');
      
      if (results && results.length > 0) {
        setSearchResults(results);
        hasSearchResultsRef.current = true;
        
        // 清除之前的搜索结果标记
        if (mapInstanceRef.current) {
          searchResultMarkersRef.current.forEach(marker => {
            if (marker) {
              mapInstanceRef.current.remove(marker);
            }
          });
          searchResultMarkersRef.current = [];
          
          // 为每个搜索结果创建标记并调整地图视图
          await displaySearchResultsOnMap(results);
        }
      } else {
        setSearchResults([]);
        hasSearchResultsRef.current = false;
        setSearchError('未找到相关地点，请尝试其他关键词');
        
        // 清除搜索结果标记
        if (mapInstanceRef.current) {
          searchResultMarkersRef.current.forEach(marker => {
            if (marker) {
              mapInstanceRef.current.remove(marker);
            }
          });
          searchResultMarkersRef.current = [];
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError('搜索失败，请重试');
      setSearchResults([]);
      hasSearchResultsRef.current = false;
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
        
        // 添加高亮效果到编号图标
        resultItems.forEach((item, i) => {
          const numberElement = item.querySelector('.lf-map-search-result-number');
          if (numberElement) {
            numberElement.classList.remove('lf-map-search-result-highlight');
            if (i === index) {
              numberElement.classList.add('lf-map-search-result-highlight');
              // 2秒后移除高亮
              setTimeout(() => {
                numberElement.classList.remove('lf-map-search-result-highlight');
              }, 2000);
            }
          }
        });
      }
    }
  };

  // 在地图上显示搜索结果
  const displaySearchResultsOnMap = async (results: MapSearchResult[]) => {
    if (!mapInstanceRef.current || !results.length) return;

    const AMap = window.AMap;
    const markers: any[] = [];
    const positions: [number, number][] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.location.longitude && result.location.latitude) {
        // 创建带编号的标记
        const marker = new AMap.Marker({
          position: [result.location.longitude, result.location.latitude],
          title: result.name,
          content: `<div class="lf-map-marker-number">${i + 1}</div>`,
          anchor: 'center'
        });

        // 为标记添加点击事件，滚动到对应的搜索结果
        marker.on('click', () => {
          scrollToSearchResult(i);
        });

        mapInstanceRef.current.add(marker);
        markers.push(marker);
        positions.push([result.location.longitude, result.location.latitude]);
      }
    }

    // 保存标记引用
    searchResultMarkersRef.current = markers;

    // 调整地图视图以包含所有搜索结果
    if (positions.length > 0) {
      try {
        mapInstanceRef.current.setFitView(positions, false, [50, 50, 50, 50]); // 添加边距
      } catch (error) {
        console.warn('setFitView failed, using setCenter instead:', error);
        // 如果setFitView失败，使用第一个结果作为中心点
        const centerPosition = positions[0];
        mapInstanceRef.current.setCenter(centerPosition);
        mapInstanceRef.current.setZoom(12);
      }
    }
  };

  // 选择搜索结果
  const handleSelectResult = async (result: MapSearchResult) => {
    setSelectedLocation(result.location);
    setSearchQuery(result.name);
    setSearchResults([]);
    hasSearchResultsRef.current = false;
    
    // 清除搜索结果标记
    if (mapInstanceRef.current) {
      searchResultMarkersRef.current.forEach(marker => {
        if (marker) {
          mapInstanceRef.current.remove(marker);
        }
      });
      searchResultMarkersRef.current = [];
    }
    
    // 移动地图到选中位置
    if (mapInstanceRef.current && result.location.longitude && result.location.latitude) {
      // 直接使用WGS-84坐标
      mapInstanceRef.current.setCenter([result.location.longitude, result.location.latitude]);
      mapInstanceRef.current.setZoom(15);
      
      // 更新选中标记
      if (markerRef.current) {
        markerRef.current.setPosition([result.location.longitude, result.location.latitude]);
        markerRef.current.setTitle(result.name);
      } else {
        const AMap = window.AMap;
        const marker = new AMap.Marker({
          position: [result.location.longitude, result.location.latitude],
          title: result.name,
          content: '<div style="background: transparent; color: red; font-size: 20px; display: flex; align-items: center; justify-content: center; padding-bottom: 0; margin-bottom: -5px;">📍</div>',
          anchor: 'bottom-center'
        });
        mapInstanceRef.current.add(marker);
        markerRef.current = marker;
      }
    }
  };

  // 清除地址
  const handleClear = () => {
    setSelectedLocation(null);
    setSearchQuery('');
    setSearchResults([]);
    hasSearchResultsRef.current = false;
    
    // 清除地图标记
    if (mapInstanceRef.current) {
      // 清除选中标记
      if (markerRef.current) {
        mapInstanceRef.current.remove(markerRef.current);
        markerRef.current = null;
      }
      
      // 清除搜索结果标记
      searchResultMarkersRef.current.forEach(marker => {
        if (marker) {
          mapInstanceRef.current.remove(marker);
        }
      });
      searchResultMarkersRef.current = [];
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
      const locationWithCoordSystem: MapLocation = {
        ...selectedLocation,
        coordinate_system: 'GCJ-02' // 高德地图使用GCJ-02坐标系统
      };
      onConfirm(locationWithCoordSystem);
      return;
    }

    // 情况3: 其他情况（只输入了搜索内容，或选择了地址但搜索框内容不匹配）
    // 只保存搜索输入框的内容作为 address.name，清除其他字段
    const textLocation: MapLocation = {
      name: searchQuery.trim(),
      longitude: undefined,
      latitude: undefined,
      address: undefined, // 清除地址字段
      coordinate_system: undefined // 清除坐标系统字段
    };
    onConfirm(textLocation);
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
          />
          {!mapLoaded && (
            <div className="lf-map-loading">
              <div className="lf-map-loading-text">地图加载中...</div>
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
                onClick={() => {
                  setSearchResults([]);
                  hasSearchResultsRef.current = false;
                  setSearchQuery(''); // 清除搜索输入框
                  setSelectedLocation(null); // 清除选中的地址数据
                  
                  // 清除地图上的标记
                  if (mapInstanceRef.current) {
                    // 清除搜索结果标记
                    searchResultMarkersRef.current.forEach(marker => {
                      if (marker) {
                        mapInstanceRef.current.remove(marker);
                      }
                    });
                    searchResultMarkersRef.current = [];
                    
                    // 清除选中标记
                    if (markerRef.current) {
                      mapInstanceRef.current.remove(markerRef.current);
                      markerRef.current = null;
                    }
                  }
                }}
                className="lf-map-search-btn"
                title="关闭搜索结果"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : (
              <button 
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="lf-map-search-btn"
                title={isSearching ? '搜索中...' : '搜索'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
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
            取消
          </button>
          {/* <button className="lf-btn lf-btn-clear" onClick={handleClear}>
            清除
          </button> */}
          <button 
            className="lf-btn lf-btn-confirm" 
            onClick={handleConfirm}
          >
            确认
          </button>
        </div>
      </div>

    </div>
  );
}
