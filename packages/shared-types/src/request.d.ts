import { RequestStatus, UrgencyLevel, MediaType } from './enums';
import { Timestamps, LocationInfo } from './common';
export interface ProblemRequest extends Timestamps {
    id: string;
    customerId: string;
    categoryId: string;
    categoryName: string;
    brandId: string | null;
    brandName: string | null;
    deviceModel: string | null;
    problemTitle: string;
    problemDescription: string;
    warrantyStatus: boolean;
    urgency: UrgencyLevel;
    preferredDate: string | null;
    preferredTime: string | null;
    status: RequestStatus;
    addressId: string | null;
    location: LocationInfo;
    mediaCount: number;
    quotesCount: number;
    deletedAt: string | null;
}
export interface RequestMedia extends Timestamps {
    id: string;
    requestId: string;
    type: MediaType;
    url: string;
    originalFilename: string | null;
    sizeBytes: number;
    mimeType: string;
}
export interface RequestFeedItem {
    id: string;
    categoryName: string;
    brandName: string | null;
    deviceModel: string | null;
    problemTitle: string;
    urgency: UrgencyLevel;
    warrantyStatus: boolean;
    status: RequestStatus;
    pincode: string;
    city: string;
    state: string;
    distanceKm?: number;
    createdAt: string;
    mediaCount: number;
    quotesCount: number;
}
export interface CreateRequestDto {
    categoryId: string;
    brandId?: string;
    deviceModel?: string;
    problemTitle: string;
    problemDescription: string;
    warrantyStatus: boolean;
    urgency: UrgencyLevel;
    preferredDate?: string;
    preferredTime?: string;
    addressId?: string;
    houseBuilding?: string;
    street?: string;
    area?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
}
//# sourceMappingURL=request.d.ts.map