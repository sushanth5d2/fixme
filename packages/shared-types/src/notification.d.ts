import { NotificationType, NotificationChannel } from './enums';
import { Timestamps } from './common';
export interface Notification extends Timestamps {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data: Record<string, unknown> | null;
    channel: NotificationChannel;
    isRead: boolean;
    readAt: string | null;
    sentAt: string | null;
}
export interface NotificationPreferences {
    userId: string;
    inAppEnabled: boolean;
    pushEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    disabledTypes: NotificationType[];
}
//# sourceMappingURL=notification.d.ts.map