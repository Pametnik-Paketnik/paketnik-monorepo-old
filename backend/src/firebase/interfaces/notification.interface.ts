export enum NotificationType {
  FACE_AUTH_REQUEST = 'face_auth_request',
  RESERVATION_UPDATE = 'reservation_update',
  BOX_ASSIGNED = 'box_assigned',
  SYSTEM_MESSAGE = 'system_message',
}

export interface BaseNotificationData {
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
}

export interface FaceAuthNotificationData extends BaseNotificationData {
  type: NotificationType.FACE_AUTH_REQUEST;
  requestId: string;
  tempToken?: string; // Optional for security
}

export interface ReservationNotificationData extends BaseNotificationData {
  type: NotificationType.RESERVATION_UPDATE;
  reservationId: number;
  status: string;
}

export interface BoxAssignmentNotificationData extends BaseNotificationData {
  type: NotificationType.BOX_ASSIGNED;
  boxId: number;
  locationId: string;
}

export interface SystemNotificationData extends BaseNotificationData {
  type: NotificationType.SYSTEM_MESSAGE;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export type NotificationData =
  | FaceAuthNotificationData
  | ReservationNotificationData
  | BoxAssignmentNotificationData
  | SystemNotificationData;

export interface SendNotificationOptions {
  token?: string;
  tokens?: string[];
  topic?: string;
  condition?: string;
  data: NotificationData;
  android?: {
    priority?: 'normal' | 'high';
    ttl?: number;
  };
  apns?: {
    headers?: Record<string, string>;
    payload?: Record<string, any>;
  };
}
