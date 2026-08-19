import { FixerVerificationStatus, ServiceAreaType, DocumentType, DocumentStatus } from './enums';
import { Timestamps } from './common';

export interface FixerProfile extends Timestamps {
  id: string;
  userId: string;
  ownerName: string;
  companyName: string;
  gstin: string | null;
  description: string | null;
  profilePhotoUrl: string | null;
  experienceYears: number;
  emergencyService: boolean;
  workingHoursStart: string | null; // HH:mm
  workingHoursEnd: string | null;
  workingDays: string[]; // ['MON', 'TUE', ...]
  verificationStatus: FixerVerificationStatus;
  rejectionReason: string | null;
  averageRating: number;
  totalReviews: number;
  completedJobs: number;
  responseRate: number; // percentage
  // Address
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
}

export interface FixerService extends Timestamps {
  id: string;
  fixerId: string;
  categoryId: string;
  categoryName: string;
  brandId: string | null;
  brandName: string | null;
}

export interface FixerServiceArea extends Timestamps {
  id: string;
  fixerId: string;
  type: ServiceAreaType;
  pincode: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
}

export interface FixerDocument extends Timestamps {
  id: string;
  fixerId: string;
  type: DocumentType;
  status: DocumentStatus;
  rejectionReason: string | null;
  // URL never exposed publicly - admin gets signed URL
}

// What a customer sees (privacy-gated)
export interface PublicFixerSummary {
  id: string;
  companyName: string;
  ownerName: string;
  profilePhotoUrl: string | null;
  averageRating: number;
  totalReviews: number;
  completedJobs: number;
  experienceYears: number;
  emergencyService: boolean;
  city: string;
  state: string;
  distanceKm?: number;
  services: Array<{ categoryName: string; brandName: string | null }>;
}
