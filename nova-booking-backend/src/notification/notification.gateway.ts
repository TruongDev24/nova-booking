import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust this for production to match your FRONTEND_URL
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Handle incoming socket connections.
   * Extracts JWT from handshake and puts owners into private rooms.
   */
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  async handleConnection(client: Socket) {
    try {
      // 1. Extract Token from handshake.auth or query
      const auth = client.handshake.auth;
      const query = client.handshake.query;
      const token = (auth?.token || query?.token) as string | undefined;

      if (!token) {
        this.logger.warn(
          `Unauthorized connection attempt from client: ${client.id}`,
        );
        client.disconnect();
        return;
      }

      // 2. Verify JWT
      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;
      const role = payload.role;

      // 3. Identification & Room Management
      // All authenticated users join the global feed
      await client.join('room_global_courts');

      // Every user gets their own private notification room
      await client.join(`room_user_${userId}`);

      // Owners join their specific management rooms
      if (role === 'COURT_MANAGER' || role === 'ADMIN') {
        const roomName = `room_owner_${userId}`;
        await client.join(roomName);
        this.logger.log(
          `Owner ${userId} joined their notification room: ${roomName}`,
        );
      }

      this.logger.log(
        `Client ${client.id} connected successfully (User: ${userId}, Rooms: Global + Private)`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Socket connection error for client ${client.id}:`,
        errorMessage,
      );
      client.disconnect();
    }
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinCourtRoom')
  handleJoinCourtRoom(client: Socket, courtId: string) {
    void client.join(`room_court_${courtId}`);
    this.logger.log(
      `Client ${client.id} joined court room: room_court_${courtId}`,
    );
  }

  @SubscribeMessage('leaveCourtRoom')
  handleLeaveCourtRoom(client: Socket, courtId: string) {
    void client.leave(`room_court_${courtId}`);
    this.logger.log(
      `Client ${client.id} left court room: room_court_${courtId}`,
    );
  }

  /**
   * Public API for other services to trigger real-time alerts
   */
  notifyOwner(
    ownerId: string,
    event: string,
    payload: Record<string, unknown>,
  ) {
    this.emitToRoom(`room_owner_${ownerId}`, event, payload);
  }

  /**
   * Emit an event to a specific room (e.g., room_court_{id}, room_global_courts)
   */
  emitToRoom(
    roomName: string,
    event: string,
    payload: Record<string, unknown>,
  ) {
    this.server.to(roomName).emit(event, payload);
    this.logger.log(
      `Real-time event [${event}] dispatched to room: ${roomName}`,
    );
  }
}
