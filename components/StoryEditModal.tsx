import React, { useState, useEffect, useRef } from 'react';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import MapSelector from './map/MapSelector';
import AddressInput from './map/AddressInput';
import type { Story, StoryWithDistance } from '../types/story';
import type { MapLocation } from '../types/map';
import type { LifeFlowSettings } from '../types';
import { t } from '../i18n';
import { validateTimeFormat, validateTimeRange, extractDateFromTime, extractTimeFromDateTime } from '../utils/timeValidation';
// 重做为 Obsidian 风格弹窗（沿用 date-picker-* 样式，压缩高度，横向表单）

interface StoryEditModalProps {
  story: StoryWithDistance | null;
  visible: boolean;
  onCancel: () => void;
  onSave: (story: StoryWithDistance) => void;
  onNext: (story: StoryWithDistance) => void;
  onDelete: (story: StoryWithDistance) => void;
  settings: LifeFlowSettings;
}

export default function StoryEditModal({ 
  story, 
  visible, 
  onCancel, 
  onSave, 
  onNext,
  onDelete,
  settings
}: StoryEditModalProps) {
  const [formData, setFormData] = useState({} as Partial<StoryWithDistance>);
  const [nameError, setNameError] = useState('');
  const [timeError, setTimeError] = useState('');
  const nameInputRef = useRef(null as any);
  const [datePickerVisibleFor, setDatePickerVisibleFor] = useState(null as null | 'start' | 'end');
  const [timePickerVisibleFor, setTimePickerVisibleFor] = useState(null as null | 'start' | 'end');
  const [mapSelectorVisible, setMapSelectorVisible] = useState(false);

  useEffect(() => {
    if (story) {
      console.log('🔍 [StoryEditModal] Story received:', {
        id: story.id,
        name: story.name,
        hasId: !!story.id
      });
      setFormData({
        id: story.id,
        name: story.name || '',
        address: story.address || { name: '' },
        start_time: story.start_time || '',
        end_time: story.end_time || '',
        description: story.description || ''
      });
    }
  }, [story]);

  const handleInputChange = (field: keyof Story, value: string) => {
    if (field === 'address') {
      setFormData((prev: Partial<StoryWithDistance>) => ({
        ...prev,
        address: value.trim() ? { name: value } : undefined
      }));
    } else {
      setFormData((prev: Partial<StoryWithDistance>) => ({
        ...prev,
        [field]: value
      }));
      
      // 验证时间格式
      if (field === 'start_time' || field === 'end_time') {
        if (value && !validateTimeFormat(value)) {
          setTimeError(t('form.error.timeFormatInvalid'));
        } else {
          setTimeError('');
        }
      }
    }
  };

  const openDatePicker = (which: 'start' | 'end') => setDatePickerVisibleFor(which);
  const clearDate = (which: 'start' | 'end') => {
    const field = which === 'start' ? 'start_time' : 'end_time';
    const currentValue = formData[field] || '';
    const timePart = extractTimeFromDateTime(currentValue);
    handleInputChange(field, timePart || '');
  };
  const confirmDate = (val: string) => {
    if (!datePickerVisibleFor) return;
    const field = datePickerVisibleFor === 'start' ? 'start_time' : 'end_time';
    const currentValue = formData[field] || '';
    const timePart = extractTimeFromDateTime(currentValue);
    const newValue = timePart ? `${val} ${timePart}` : val;
    handleInputChange(field, newValue);
    setDatePickerVisibleFor(null);
  };
  const cancelDate = () => setDatePickerVisibleFor(null);

  const openTimePicker = (which: 'start' | 'end') => setTimePickerVisibleFor(which);
  const clearTime = (which: 'start' | 'end') => {
    const field = which === 'start' ? 'start_time' : 'end_time';
    const currentValue = formData[field] || '';
    const datePart = extractDateFromTime(currentValue);
    handleInputChange(field, datePart || '');
  };
  const confirmTime = (val: string) => {
    if (!timePickerVisibleFor) return;
    const field = timePickerVisibleFor === 'start' ? 'start_time' : 'end_time';
    const currentValue = formData[field] || '';
    const datePart = extractDateFromTime(currentValue);
    // 保持原始时间格式，不强制添加秒数
    const timePart = val; // 直接使用用户选择的时间格式
    const newValue = datePart ? `${datePart} ${timePart}` : timePart;
    handleInputChange(field, newValue);
    setTimePickerVisibleFor(null);
  };
  const cancelTime = () => setTimePickerVisibleFor(null);

  // 地图选择器相关函数
  const openMapSelector = () => {
    setMapSelectorVisible(true);
  };

  const closeMapSelector = () => {
    setMapSelectorVisible(false);
  };

  const handleMapLocationSelect = (location: MapLocation) => {
    console.log('🔍 [handleMapLocationSelect] Received location:', location);
    
    // 如果名称为空，清除整个地址对象
    if (!location.name || location.name.trim() === '') {
      console.log('🔍 [handleMapLocationSelect] Clearing address (empty name)');
      setFormData((prev: Partial<StoryWithDistance>) => ({
        ...prev,
        address: undefined
      }));
    } else {
      // 创建地址对象，只包含非空字段
      const address: any = {
        name: location.name
      };
      
      // 只有当字段有值时才添加到地址对象中
      if (location.address !== undefined) {
        address.address = location.address;
      }
      if (location.longitude !== undefined) {
        address.longitude = location.longitude;
      }
      if (location.latitude !== undefined) {
        address.latitude = location.latitude;
      }
      if (location.coordinate_system !== undefined) {
        address.coordinate_system = location.coordinate_system;
      }
      
      console.log('🔍 [handleMapLocationSelect] Setting address:', address);
      
      setFormData((prev: Partial<StoryWithDistance>) => ({
        ...prev,
        address: address
      }));
    }
    setMapSelectorVisible(false);
  };

  const handleSave = () => {
    if (!story) {
      return;
    }
    
    if (!validate()) {
      return;
    }
    
    const updatedStory: StoryWithDistance = {
      ...story,
      ...formData
    } as StoryWithDistance;
    
    onSave(updatedStory);
  };

  const handleNext = () => {
    if (!story) return;
    if (!validate()) return;
    
    const updatedStory: StoryWithDistance = {
      ...story,
      ...formData
    } as StoryWithDistance;
    onNext(updatedStory);
  };

  const handleDelete = () => {
    if (!story) return;
    const target: StoryWithDistance = {
      ...story,
      ...formData
    } as StoryWithDistance;
    onDelete(target);
  };

  const validate = (): boolean => {
    const name = (formData.name || '').trim();
    if (!name) {
      setNameError(t('form.error.nameRequired'));
      nameInputRef.current?.focus();
      return false;
    }
    setNameError('');
    
    // 验证时间格式
    const startTime = formData.start_time || '';
    const endTime = formData.end_time || '';
    
    if (startTime && !validateTimeFormat(startTime)) {
      setTimeError(t('form.error.startTimeInvalid'));
      return false;
    }
    
    if (endTime && !validateTimeFormat(endTime)) {
      setTimeError(t('form.error.endTimeInvalid'));
      return false;
    }
    
    // 验证时间范围
    const timeRangeValidation = validateTimeRange(startTime, endTime);
    if (!timeRangeValidation.valid) {
      setTimeError(timeRangeValidation.error || t('form.error.timeRangeInvalid'));
      return false;
    }
    
    setTimeError('');
    return true;
  };

  if (!visible || !story) return null;

  return (
    <div className='lf-modal-mask' onClick={(e) => { if (e.currentTarget === e.target) onCancel(); }}>
      <div className='lf-modal' onClick={(e) => e.stopPropagation()}>
        <div className='lf-modal-content'>
          <div className='lf-modal-title'>{t('form.editStory')}</div>
          <div className='form-grid'>
            <label>{t('form.name')} *</label>
            <input
              type='text'
              value={formData.name || ''}
              placeholder={t('form.name.placeholder')}
              ref={nameInputRef}
              className={nameError ? 'lf-input-error' : undefined as any}
              onChange={(e) => { setNameError(''); handleInputChange('name', e.target.value); }}
            />
            {nameError && (<div className='lf-field-error'>
              {nameError}
            </div>)}


            <label>{t('form.address')}</label>
            {settings.mapApiProvider === 'none' ? (
              // 当地图API提供商为None时，显示普通文本输入框
              <input
                type="text"
                value={formData.address?.name || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder={t('form.address.placeholder')}
                className="lf-input"
              />
            ) : (
              // 当地图API提供商为高德时，显示带地图选择功能的输入框
              <AddressInput
                value={formData.address?.name || ''}
                onChange={(value) => handleInputChange('address', value)}
                onMapClick={openMapSelector}
                placeholder={t('form.address.placeholder')}
              />
            )}

            <label>{t('form.timeStart')}</label>
            <div className='lf-time-input-group'>
              <input
                type='text'
                value={extractDateFromTime(formData.start_time || '') || ''}
                placeholder={t('form.date.placeholder')}
                readOnly
                onClick={() => openDatePicker('start')}
                className='lf-time-input lf-date-input'
              />
              <input
                type='text'
                value={extractTimeFromDateTime(formData.start_time || '') || ''}
                placeholder={t('form.timeStart.placeholder')}
                readOnly
                onClick={() => openTimePicker('start')}
                className='lf-time-input lf-time-input'
              />
            </div>

            <label>{t('form.timeEnd')}</label>
            <div className='lf-time-input-group'>
              <input
                type='text'
                value={extractDateFromTime(formData.end_time || '') || ''}
                placeholder={t('form.date.placeholder')}
                readOnly
                onClick={() => openDatePicker('end')}
                className='lf-time-input lf-date-input'
              />
              <input
                type='text'
                value={extractTimeFromDateTime(formData.end_time || '') || ''}
                placeholder={t('form.timeStart.placeholder')}
                readOnly
                onClick={() => openTimePicker('end')}
                className='lf-time-input lf-time-input'
              />
            </div>
            {timeError && (<div className='lf-field-error'>
              {timeError}
            </div>)}

            <label>{t('form.description')}</label>
            <textarea
              value={formData.description || ''}
              placeholder={t('form.description.placeholder')}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>

          <div className='lf-modal-actions actions-primary'>
            <button className='lf-btn lf-btn-cancel' onClick={onCancel}>{t('common.cancel')}</button>
            <button className='lf-btn lf-btn-dangerous' onClick={handleDelete}>{t('common.delete')}</button>
            <button className='lf-btn lf-btn-confirm' onClick={handleSave}>{t('common.save')}</button>
          </div>
          <div className='lf-modal-actions actions-secondary'>
            <button className='lf-btn lf-btn-ghost' onClick={handleNext}>{t('common.next')}</button>
        </div>
        <DatePicker
          visible={!!datePickerVisibleFor}
          value={extractDateFromTime((datePickerVisibleFor === 'start' ? formData.start_time : formData.end_time) || '') || ''}
          onCancel={cancelDate}
          onClear={() => { if (datePickerVisibleFor) clearDate(datePickerVisibleFor); cancelDate(); }}
          onConfirm={confirmDate}
        />
        <TimePicker
          visible={!!timePickerVisibleFor}
          value={extractTimeFromDateTime((timePickerVisibleFor === 'start' ? formData.start_time : formData.end_time) || '') || ''}
          onCancel={cancelTime}
          onClear={() => { if (timePickerVisibleFor) clearTime(timePickerVisibleFor); cancelTime(); }}
          onConfirm={confirmTime}
          title={timePickerVisibleFor === 'start' ? t('form.timeStart') : t('form.timeEnd')}
        />
        {settings.mapApiProvider !== 'none' && (
          <MapSelector
            visible={mapSelectorVisible}
            initialLocation={formData.address ? {
              longitude: formData.address.longitude,
              latitude: formData.address.latitude,
              name: formData.address.name,
              address: formData.address.address,
              coordinate_system: formData.address.coordinate_system
            } : undefined}
            onCancel={closeMapSelector}
            onConfirm={handleMapLocationSelect}
            title="选择地点"
            placeholder="搜索地点..."
            settings={settings}
          />
        )}
        </div>
      </div>
    </div>
  );
} 