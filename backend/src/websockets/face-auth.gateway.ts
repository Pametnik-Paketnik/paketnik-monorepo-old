import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface JwtPayload {
  sub: number;
  email: string;
  type?: string;
  twoFactorPending?: boolean;
}

interface FaceAuthCompletionData {
  success: boolean;
  message: string;
  access_token?: string;
  user?: {
    id: number;
    name: string;
    surname: string;
    email: string;
    userType: string;
  };
}

interface FaceAuthResult {
  success: boolean;
  data?: FaceAuthCompletionData;
  message?: string;
}

@WebSocketGateway({
  namespace: '/face-auth',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class FaceAuthGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FaceAuthGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Join a Face ID request room
   */
  @SubscribeMessage('join_face_auth_room')
  async joinRoom(
    @MessageBody() data: { requestId: string; tempToken?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const roomName = `face_auth_${data.requestId}`;

      // Validate temp token if provided
      if (data.tempToken) {
        try {
          const decoded = await this.jwtService.verifyAsync<JwtPayload>(
            data.tempToken,
          );
          this.logger.log(
            `User ${decoded.sub} joined Face ID room: ${roomName}`,
          );
        } catch {
          this.logger.warn(`Invalid temp token for room ${roomName}`);
          client.emit('face_auth_error', {
            message: 'Invalid authentication token',
          });
          return;
        }
      }

      await client.join(roomName);
      client.emit('joined_room', {
        requestId: data.requestId,
        message: 'Successfully joined Face ID room',
      });

      this.logger.log(`Client ${client.id} joined room: ${roomName}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to join room: ${errorMessage}`);
      client.emit('face_auth_error', {
        message: 'Failed to join Face ID room',
      });
    }
  }

  /**
   * Leave a Face ID request room
   */
  @SubscribeMessage('leave_face_auth_room')
  async leaveRoom(
    @MessageBody() data: { requestId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `face_auth_${data.requestId}`;
    await client.leave(roomName);
    client.emit('left_room', { requestId: data.requestId });
    this.logger.log(`Client ${client.id} left room: ${roomName}`);
  }

  /**
   * Notify room when Face ID authentication is complete
   */
  notifyFaceAuthComplete(requestId: string, result: FaceAuthResult) {
    const roomName = `face_auth_${requestId}`;
    this.logger.log(`Notifying room ${roomName} of Face ID completion`);

    if (result.success) {
      this.server.to(roomName).emit('face_auth_complete', {
        requestId,
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    } else {
      this.server.to(roomName).emit('face_auth_complete', {
        requestId,
        success: false,
        error: result.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Notify room of Face ID request status updates
   */
  notifyFaceAuthStatus(requestId: string, status: string, message?: string) {
    const roomName = `face_auth_${requestId}`;
    this.logger.log(`Notifying room ${roomName} of status: ${status}`);

    this.server.to(roomName).emit('face_auth_status', {
      requestId,
      status,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Force join a client to a room (for server-side operations)
   */
  async joinClientToRoom(socketId: string, requestId: string) {
    const roomName = `face_auth_${requestId}`;
    const clientSocket = this.server.sockets.sockets.get(socketId);

    if (clientSocket) {
      await clientSocket.join(roomName);
      this.logger.log(`Forced client ${socketId} to join room: ${roomName}`);
      return true;
    } else {
      this.logger.warn(`Client ${socketId} not found for room: ${roomName}`);
      return false;
    }
  }

  /**
   * Get room information for debugging
   */
  getRoomInfo(requestId: string) {
    const roomName = `face_auth_${requestId}`;
    const room = this.server.sockets.adapter.rooms.get(roomName);
    return {
      roomName,
      clientCount: room ? room.size : 0,
      clients: room ? Array.from(room) : [],
    };
  }
}
