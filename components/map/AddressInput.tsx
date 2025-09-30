import React from 'react';
import type { MapLocation } from '../../types/map';
import { t } from '../../i18n';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onMapClick: () => void;
  placeholder?: string;
  className?: string;
}

export default function AddressInput({
  value,
  onChange,
  onMapClick,
  placeholder = t('map.addressPlaceholder'),
  className = ''
}: AddressInputProps) {
  return (
    <div className={`lf-address-input-group ${className}`}>
      <input
        type='text'
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onClick={onMapClick}
        className='lf-address-input lf-address-input-clickable'
        readOnly
      />
    </div>
  );
}
