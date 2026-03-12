import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../services/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
    namespace: 'notifications',
    cors: {
        origin: [
            'http://localhost:3000',
            'https://blockscode-production.vercel.app',
            'tauri://localhost',
            'http://localhost:1420',
            'https://www.blockscode.me',
            'https://blockscode.me'
        ],
        credentials: true
    },
})
export class NotificationGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService
    ) { }

    @WebSocketServer()
    server: Server;

    // Map socketId → userId for cleanup
    private connectedUsers = new Map<string, string>();

    private extractToken(client: Socket): string | null {
        if (client.handshake.auth && client.handshake.auth.token) {
            return client.handshake.auth.token;
        }
        const authHeader = client.handshake.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.split(' ')[1];
        }
        const cookieHeader = client.handshake.headers.cookie;
        if (cookieHeader) {
            try {
                const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]*)/);
                if (match && match[1]) return match[1];
            } catch (e) {
                console.warn('[NotificationGateway] Error parsing cookies', e);
            }
        }
        return null;
    }

    afterInit() {
        console.log('[NotificationGateway] Initialized');
    }

    async handleConnection(client: Socket) {
        try {
            const token = this.extractToken(client);
            if (!token) throw new Error('No token provided');

            const payload = this.jwtService.verify(token);
            const userId = payload.sub;

            // Store userId on socket data for later use
            client.data.userId = userId;
            this.connectedUsers.set(client.id, userId);

            // Join user-specific room so we can target them
            client.join(`user_${userId}`);

            console.log(`[NotificationGateway] User ${userId} connected (${client.id})`);
        } catch (error) {
            console.log(`[NotificationGateway] Connection rejected: ${client.id}`);
            client.disconnect(true);
        }
    }

    async handleDisconnect(client: Socket) {
        const userId = this.connectedUsers.get(client.id);
        if (userId) {
            this.connectedUsers.delete(client.id);
            console.log(`[NotificationGateway] User ${userId} disconnected (${client.id})`);
        }
    }

    /**
     * Called by TeacherService after creating an announcement.
     * Looks up all students in the target groups and emits to their rooms.
     */
    async broadcastAnnouncement(announcement: {
        id: string;
        title: string;
        content: string;
        attachments: any;
        teacherName: string;
        groupNames: string[];
        createdAt: Date;
    }, studentIds: string[]) {
        for (const studentId of studentIds) {
            this.server.to(`user_${studentId}`).emit('new_announcement', announcement);
        }
        console.log(`[NotificationGateway] Broadcast announcement "${announcement.title}" to ${studentIds.length} students`);
    }

    /**
     * Client subscribes to this on dashboard load to confirm connection.
     */
    @SubscribeMessage('ping')
    handlePing(@ConnectedSocket() client: Socket) {
        return { status: 'pong' };
    }
}
