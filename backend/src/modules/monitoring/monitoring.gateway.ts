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
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { SubmissionService } from '../submission/submission.service';
import { PrismaService } from '../../services/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

@WebSocketGateway({
    namespace: 'proctoring',
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
export class MonitoringGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        @InjectRedis() private readonly redis: Redis,
        private readonly submissionService: SubmissionService,
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService
    ) { }

    @WebSocketServer()
    server: Server;

    private activeConnections = new Map<string, { userId: string; examId: string }>(); // socketId -> Metadata

    afterInit(server: Server) {
        console.log('Proctoring Gateway initialized');
    }

    async handleConnection(client: Socket) {
        try {
            let cookieToken = null;
            const cookieHeader = client.handshake.headers.cookie;
            if (cookieHeader) {
                const cookies = cookieHeader.split(';').reduce((acc: any, str: string) => {
                    const [key, value] = str.split('=').map(s => s.trim());
                    acc[key] = value;
                    return acc;
                }, {});
                cookieToken = cookies['auth_token'];
            }

            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1] || cookieToken;
            if (!token) throw new Error('No token provided');

            const payload = this.jwtService.verify(token);
            // Optionally store the verified userId mapping:
            // client.data.userId = payload.sub;

            console.log(`Client connected and authenticated: ${client.id}`);
        } catch (error) {
            console.log(`Client connection rejected (unauthorized): ${client.id}`, error);
            client.disconnect(true);
        }
    }

    async handleDisconnect(client: Socket) {
        const meta = this.activeConnections.get(client.id);
        if (meta) {
            this.activeConnections.delete(client.id);
            console.log(`Client disconnected: ${client.id} (User: ${meta.userId}, Exam: ${meta.examId})`);

            // Notify teachers immediately
            this.server.to(`exam_${meta.examId}_monitor`).emit('student_status', {
                userId: meta.userId,
                online: false
            });
        } else {
            console.log(`Client disconnected: ${client.id}`);
        }
    }

    @SubscribeMessage('join_exam')
    async handleJoinExam(
        @MessageBody() data: { examId: string; userId: string; role: string; deviceId?: string; tabId?: string },
        @ConnectedSocket() client: Socket,
    ) {
        if (!data.examId || !data.userId) return { status: 'error' };

        const examRoom = `exam_${data.examId}`;
        client.join(examRoom);

        if (data.role === 'teacher') {
            client.join(`${examRoom}_monitor`);
            console.log(`[JoinExam] Teacher ${data.userId} joined monitor`);
        } else {
            // Student logic - Takeover (Kick Out) Model
            const studentRoom = `student_${data.userId}_exam_${data.examId}`;

            // 1. SURGICAL KICK: Disconnect only OTHER sockets in this student's room
            const peers = await this.server.in(studentRoom).fetchSockets();

            for (const s of peers) {
                if (s.id !== client.id) {
                    console.log(`[JoinExam] Surgical kick for old socket ${s.id} (user ${data.userId})`);
                    s.emit('error', {
                        message: 'Another instance of this exam is active. This session is now inactive.'
                    });
                    s.disconnect(true);
                }
            }

            // JOIN the room for future displacement
            client.join(studentRoom);
            this.activeConnections.set(client.id, { userId: data.userId, examId: data.examId });

            // 2. SET Redis ownership IMMEDIATELY
            // const identity = {
            //     deviceId: data.deviceId,
            //     tabId: data.tabId,
            //     socketId: client.id,
            //     joinedAt: Date.now()
            // };

            // await this.redis.set(
            //     `exam:${data.examId}:student:${data.userId}:online`,
            //     JSON.stringify(identity),
            //     'EX',
            //     120
            // );

            // Notify teachers
            this.server.to(`${examRoom}_monitor`).emit('student_status', {
                userId: data.userId,
                online: true
            });
        }
        return { status: 'joined' };
    }

    @SubscribeMessage('save_answer')
    async handleSaveAnswer(
        @MessageBody() data: { sessionId: string; answer: any },
        @ConnectedSocket() client: Socket,
    ) {
        await this.submissionService.queueAnswer(data.sessionId, data.answer);
        return { status: 'saved' };
    }

    @SubscribeMessage('heartbeat')
    async handleHeartbeat(
        @MessageBody() data: { sessionId: string; timestamp: number },
        @ConnectedSocket() client: Socket,
    ) {
        // Can be used to track last seen timestamp in Redis for precise online status
        // await this.redis.set(`session:last_seen:${data.sessionId}`, Date.now(), 'EX', 60);
        return { status: 'alive' };
    }

    @SubscribeMessage('log_violation')
    async handleLogViolation(
        @MessageBody() data: {
            sessionId: string;
            examId: string;
            userId: string;
            type: string;
            message: string;
            details?: any;
        },
        @ConnectedSocket() client: Socket,
    ) {
        // PERFORMANCE: Check Cache for Session Status & Limits
        const cacheKey = `session:status:${data.sessionId}`;
        let cachedData = await this.redis.get(cacheKey);

        // Parse cached data or init as null
        let sessionData: { status: string; tabSwitchLimit: number | null } = cachedData ? JSON.parse(cachedData) : null;

        if (!sessionData) {
            const examSession = await this.prisma.examSession.findUnique({
                where: { id: data.sessionId },
                select: {
                    status: true,
                    exam: { select: { tabSwitchLimit: true } }
                }
            });
            if (!examSession) {
                return { status: 'rejected', reason: 'Session not found' };
            }
            sessionData = {
                status: examSession.status,
                tabSwitchLimit: examSession.exam?.tabSwitchLimit || null
            };
            // Cache for short duration as status can change
            await this.redis.set(cacheKey, JSON.stringify(sessionData), 'EX', 60);
        }

        const status = sessionData.status;

        // 1. BLOCK violations if session is already completed or terminated
        if (status === 'COMPLETED' || status === 'TERMINATED') {
            console.log(`[Proctoring] Rejected violation: Session ${data.sessionId} is ${status}`);
            return { status: 'rejected', reason: 'Session inactive' };
        }

        // Save to DB (Fire and forget? No, wait for it to ensure consistency)
        await this.prisma.violation.create({
            data: {
                sessionId: data.sessionId,
                type: data.type,
                message: data.message,
                severity: 'WARNING',
                timestamp: new Date()
            }
        });

        // OPTIMIZATION: Use Redis Atomic Counters for Tab Switches
        const keyIn = `violation:count:in:${data.sessionId}`;
        const keyOut = `violation:count:out:${data.sessionId}`;

        let tabSwitchInCount = 0;
        let tabSwitchOutCount = 0;

        if (data.type === 'TAB_SWITCH_IN') {
            // Increment IN counter
            // If key missing, we might need to init it. But INCR starts at 1 so it's safer to just rely on Redis if we assume consistency.
            // However, upon restart Redis is empty. We need lazy loading.

            if (await this.redis.exists(keyIn)) {
                tabSwitchInCount = await this.redis.incr(keyIn);
            } else {
                // Fetch initial count from DB
                const dbCount = await this.prisma.violation.count({
                    where: { sessionId: data.sessionId, type: 'TAB_SWITCH_IN' }
                });
                // dbCount includes the one we just created above? Yes, because we awaited create.
                await this.redis.set(keyIn, dbCount);
                tabSwitchInCount = dbCount;
            }

            // Get OUT count without incrementing
            const cachedOut = await this.redis.get(keyOut);
            if (cachedOut) {
                tabSwitchOutCount = parseInt(cachedOut);
            } else {
                tabSwitchOutCount = await this.prisma.violation.count({
                    where: { sessionId: data.sessionId, type: { in: ['TAB_SWITCH', 'TAB_SWITCH_OUT'] } }
                });
                await this.redis.set(keyOut, tabSwitchOutCount);
            }

        } else if (data.type === 'TAB_SWITCH' || data.type === 'TAB_SWITCH_OUT') {
            // Increment OUT counter
            if (await this.redis.exists(keyOut)) {
                tabSwitchOutCount = await this.redis.incr(keyOut);
            } else {
                const dbCount = await this.prisma.violation.count({
                    where: { sessionId: data.sessionId, type: { in: ['TAB_SWITCH', 'TAB_SWITCH_OUT'] } }
                });
                await this.redis.set(keyOut, dbCount);
                tabSwitchOutCount = dbCount;
            }

            // Get IN count without incrementing
            const cachedIn = await this.redis.get(keyIn);
            if (cachedIn) {
                tabSwitchInCount = parseInt(cachedIn);
            } else {
                tabSwitchInCount = await this.prisma.violation.count({
                    where: { sessionId: data.sessionId, type: 'TAB_SWITCH_IN' }
                });
                await this.redis.set(keyIn, tabSwitchInCount);
            }
        } else {
            // For other violations, just fetch current counts if needed or return 0
            // Or fallback to checking DB if we really need them for the event
            // But usually we only send updated counts on tab switches.

            // Just read cache or DB
            const cachedIn = await this.redis.get(keyIn);
            tabSwitchInCount = cachedIn ? parseInt(cachedIn) : await this.prisma.violation.count({ where: { sessionId: data.sessionId, type: 'TAB_SWITCH_IN' } });

            const cachedOut = await this.redis.get(keyOut);
            tabSwitchOutCount = cachedOut ? parseInt(cachedOut) : await this.prisma.violation.count({ where: { sessionId: data.sessionId, type: { in: ['TAB_SWITCH', 'TAB_SWITCH_OUT'] } } });
        }

        // 2. CHECK TAB SWITCH LIMIT (Auto-termination)
        const limit = sessionData.tabSwitchLimit;
        if (data.type === 'TAB_SWITCH_IN' && limit && tabSwitchInCount >= limit) {
            console.log(`[Proctoring] Auto-terminating session ${data.sessionId} for user ${data.userId} due to tab switch limit (${tabSwitchInCount}/${limit})`);

            await this.prisma.examSession.update({
                where: { id: data.sessionId },
                data: { status: 'TERMINATED', endTime: new Date() }
            });

            // Force kick student
            await this.forceTerminate(data.examId, data.userId);

            // Notify teachers about the termination
            this.server
                .to(`exam_${data.examId}_monitor`)
                .emit('student_terminated', {
                    userId: data.userId,
                    reason: `Exceeded Tab Switch Limit (${limit})`
                });

            return { status: 'terminated' };
        }

        this.server
            .to(`exam_${data.examId}_monitor`)
            .emit('live_violation', {
                userId: data.userId,
                type: data.type,
                message: data.message,
                details: data.details,
                tabOuts: tabSwitchOutCount,
                tabIns: tabSwitchInCount,
                timestamp: new Date()
            });

        console.log(`[Proctoring] Emitting live_violation to exam_${data.examId}_monitor:`, data.type);


        return { status: 'recorded' };
    }

    @SubscribeMessage('request_stream')
    async handleRequestStream(
        @MessageBody() data: { targetUserId: string; examId: string; teacherPeerId: string },
        @ConnectedSocket() client: Socket,
    ) {
        // Teacher requests stream from student
        // Broadcast to the specific student room
        const studentRoom = `student_${data.targetUserId}_exam_${data.examId}`;
        console.log(`[Proctoring] Streaming requested for user ${data.targetUserId} in exam ${data.examId} (Peer: ${data.teacherPeerId})`);

        this.server.to(studentRoom).emit('cmd_request_stream', {
            teacherSocketId: client.id,
            teacherPeerId: data.teacherPeerId
        });
        return { status: 'requested' };
    }

    async forceTerminate(examId: string, userId: string) {
        // 1. Broadcast error to student rooms (emit 'error' OR 'force_terminate' for robust handling)
        const studentRoom = `student_${userId}_exam_${examId}`;
        console.log(`[Proctoring] Force terminating user ${userId} in exam ${examId}`);

        this.server.to(studentRoom).emit('error', {
            message: 'EXAM_TERMINATED'
        });

        // Also emit a specific event that isn't dependent on generic "error" handling
        this.server.to(studentRoom).emit('force_terminate', {
            message: 'EXAM_TERMINATED'
        });

        // 2. Disconnect sockets with a slight delay to ensure message delivery
        setTimeout(async () => {
            try {
                const sockets = await this.server.in(studentRoom).fetchSockets();
                for (const s of sockets) {
                    s.disconnect(true);
                }
            } catch (e) {
                console.error('[Proctoring] Error disconnecting sockets:', e);
            }
        }, 1000); // 1 second delay

        // 3. Clear Redis
        // await this.redis.del(`exam:${examId}:student:${userId}:online`);
        this.activeConnections.forEach((meta, sid) => {
            if (meta.userId === userId) this.activeConnections.delete(sid);
        });
    }
}
