import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_ADMIN_TOKEN } from './firebase-admin.provider';
import {
  NotificationData,
  NotificationType,
  FaceAuthNotificationData,
  SendNotificationOptions,
} from './interfaces/notification.interface';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(
    @Inject(FIREBASE_ADMIN_TOKEN)
    private readonly firebaseApp: admin.app.App,
  ) {}

  /**
   * Get Firebase Messaging instance
   */
  private get messaging(): admin.messaging.Messaging {
    return this.firebaseApp.messaging();
  }

  /**
   * Get Firebase Messaging instance (public method for health checks)
   */
  getMessaging(): admin.messaging.Messaging {
    return this.messaging;
  }

  /**
   * Send notification to a single device
   */
  async sendToDevice(
    token: string,
    notificationData: NotificationData,
    options?: Partial<SendNotificationOptions>,
  ): Promise<string> {
    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: notificationData.title,
          body: notificationData.body,
        },
        data: this.prepareDataPayload(notificationData),
        android: {
          priority: options?.android?.priority || 'high',
          ttl: options?.android?.ttl || 300000, // 5 minutes default
          notification: {
            sound: 'default',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
            ...options?.apns?.payload,
          },
          headers: options?.apns?.headers,
        },
      };

      const response = await this.messaging.send(message);
      this.logger.log(
        `Notification sent successfully to device: ${token.substring(0, 10)}...`,
      );
      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send notification to device: ${errorMessage}`,
        errorStack,
      );
      throw new BadRequestException(
        `Failed to send notification: ${errorMessage}`,
      );
    }
  }

  /**
   * Send notification to multiple devices
   */
  async sendToMultipleDevices(
    tokens: string[],
    notificationData: NotificationData,
    options?: Partial<SendNotificationOptions>,
  ): Promise<admin.messaging.BatchResponse> {
    try {
      if (tokens.length === 0) {
        throw new BadRequestException('No device tokens provided');
      }

      if (tokens.length > 500) {
        throw new BadRequestException(
          'Cannot send to more than 500 devices at once',
        );
      }

      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: notificationData.title,
          body: notificationData.body,
        },
        data: this.prepareDataPayload(notificationData),
        android: {
          priority: options?.android?.priority || 'high',
          ttl: options?.android?.ttl || 300000,
          notification: {
            sound: 'default',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
            ...options?.apns?.payload,
          },
          headers: options?.apns?.headers,
        },
      };

      const response = await this.messaging.sendEachForMulticast(message);
      this.logger.log(
        `Multicast notification sent to ${tokens.length} devices. Success: ${response.successCount}, Failed: ${response.failureCount}`,
      );

      // Log failed tokens for debugging
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorMessage = resp.error?.message || 'Unknown error';
            this.logger.warn(
              `Failed to send to token ${tokens[idx].substring(0, 10)}...: ${errorMessage}`,
            );
          }
        });
      }

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send multicast notification: ${errorMessage}`,
        errorStack,
      );
      throw new BadRequestException(
        `Failed to send notifications: ${errorMessage}`,
      );
    }
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(
    topic: string,
    notificationData: NotificationData,
    options?: Partial<SendNotificationOptions>,
  ): Promise<string> {
    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: notificationData.title,
          body: notificationData.body,
        },
        data: this.prepareDataPayload(notificationData),
        android: {
          priority: options?.android?.priority || 'normal',
          ttl: options?.android?.ttl || 86400000, // 24 hours for topic messages
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
            ...options?.apns?.payload,
          },
          headers: options?.apns?.headers,
        },
      };

      const response = await this.messaging.send(message);
      this.logger.log(`Topic notification sent to topic: ${topic}`);
      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send topic notification: ${errorMessage}`,
        errorStack,
      );
      throw new BadRequestException(
        `Failed to send topic notification: ${errorMessage}`,
      );
    }
  }

  /**
   * Send Face Authentication request notification
   */
  async sendFaceAuthRequest(
    deviceTokens: string[],
    requestId: string,
    userEmail?: string,
  ): Promise<admin.messaging.BatchResponse> {
    const notificationData: FaceAuthNotificationData = {
      type: NotificationType.FACE_AUTH_REQUEST,
      title: 'Face Authentication Required',
      body: userEmail
        ? `Login request for ${userEmail}. Please verify your identity.`
        : 'Login request from webapp. Please verify your identity.',
      timestamp: new Date().toISOString(),
      requestId,
    };

    return this.sendToMultipleDevices(deviceTokens, notificationData, {
      android: {
        priority: 'high',
        ttl: 300000, // 5 minutes for face auth
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'content-available': 1, // Enable background processing
          },
        },
      },
    });
  }

  /**
   * Validate device token format
   */
  async validateDeviceToken(token: string): Promise<boolean> {
    try {
      // Try to send a dry-run message to validate the token
      await this.messaging.send(
        {
          token,
          notification: {
            title: 'Test',
            body: 'Test',
          },
        },
        true,
      ); // dry-run = true

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Invalid device token: ${token.substring(0, 10)}... - ${errorMessage}`,
      );
      return false;
    }
  }

  /**
   * Subscribe device token to topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<any> {
    try {
      const response = await this.messaging.subscribeToTopic(tokens, topic);
      this.logger.log(`Subscribed devices to topic: ${topic}`);
      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to subscribe to topic ${topic}: ${errorMessage}`,
        errorStack,
      );
      throw new BadRequestException(
        `Failed to subscribe to topic: ${errorMessage}`,
      );
    }
  }

  /**
   * Unsubscribe device token from topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<any> {
    try {
      const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
      this.logger.log(`Unsubscribed devices from topic: ${topic}`);
      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to unsubscribe from topic ${topic}: ${errorMessage}`,
        errorStack,
      );
      throw new BadRequestException(
        `Failed to unsubscribe from topic: ${errorMessage}`,
      );
    }
  }

  /**
   * Send notification using DTO
   */
  async sendNotification(
    sendNotificationDto: SendNotificationDto,
  ): Promise<string | admin.messaging.BatchResponse> {
    // Create notification data with timestamp
    const notificationData: NotificationData = {
      ...sendNotificationDto.data,
      timestamp: new Date().toISOString(),
      // Add default requestId for face_auth_request if missing
      ...(sendNotificationDto.data.type ===
        NotificationType.FACE_AUTH_REQUEST && {
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      }),
    } as NotificationData;

    if (sendNotificationDto.token) {
      return this.sendToDevice(sendNotificationDto.token, notificationData);
    } else if (
      sendNotificationDto.tokens &&
      sendNotificationDto.tokens.length > 0
    ) {
      return this.sendToMultipleDevices(
        sendNotificationDto.tokens,
        notificationData,
      );
    } else if (sendNotificationDto.topic) {
      return this.sendToTopic(sendNotificationDto.topic, notificationData);
    } else {
      throw new BadRequestException(
        'Must provide either token, tokens, or topic',
      );
    }
  }

  /**
   * Prepare data payload for FCM (all values must be strings)
   */
  private prepareDataPayload(
    notificationData: NotificationData,
  ): Record<string, string> {
    const payload: Record<string, string> = {
      type: notificationData.type,
      timestamp: notificationData.timestamp,
    };

    // Add type-specific data using proper TypeScript discriminated unions
    switch (notificationData.type) {
      case NotificationType.FACE_AUTH_REQUEST: {
        // TypeScript now knows this is FaceAuthNotificationData
        payload.requestId = notificationData.requestId;
        if (notificationData.tempToken) {
          payload.tempToken = notificationData.tempToken;
        }
        break;
      }

      case NotificationType.RESERVATION_UPDATE: {
        // TypeScript now knows this is ReservationNotificationData
        payload.reservationId = notificationData.reservationId.toString();
        payload.status = notificationData.status;
        break;
      }

      case NotificationType.BOX_ASSIGNED: {
        // TypeScript now knows this is BoxAssignmentNotificationData
        payload.boxId = notificationData.boxId.toString();
        payload.locationId = notificationData.locationId;
        break;
      }

      case NotificationType.SYSTEM_MESSAGE: {
        // TypeScript now knows this is SystemNotificationData
        payload.priority = notificationData.priority;
        break;
      }
    }

    return payload;
  }

  // ===== DATABASE-INTEGRATED METHODS =====
  // NOTE: These will be added when we integrate with UserDevicesService
  // For now, keeping the service database-agnostic

  /**
   * Send notification to a user by their ID (requires UserDevicesService injection)
   * This method can be added later when integrating with the database
   */
  // async sendToUser(userId: number, notificationData: NotificationData): Promise<admin.messaging.BatchResponse> {
  //   const tokens = await this.userDevicesService.getUserFcmTokens(userId);
  //   if (tokens.length === 0) {
  //     throw new BadRequestException(`No active devices found for user ${userId}`);
  //   }
  //   return this.sendToMultipleDevices(tokens, notificationData);
  // }
}
