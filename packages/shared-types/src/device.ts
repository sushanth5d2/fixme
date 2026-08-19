import { Timestamps } from './common';

export interface DeviceCategory extends Timestamps {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface DeviceBrand extends Timestamps {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  // Categories this brand applies to (many-to-many)
  categoryIds: string[];
}
