import { AddressType } from './enums';
import { Timestamps } from './common';


export interface CustomerProfile extends Timestamps {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  // mobile and email from User record
}

export interface Address extends Timestamps {
  id: string;
  customerId: string;
  type: AddressType;
  houseBuilding: string;
  street: string;
  area: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  deletedAt: string | null;
}

export interface CreateAddressDto {
  type: AddressType;
  houseBuilding: string;
  street: string;
  area: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface UpdateAddressDto extends Partial<CreateAddressDto> {}
