import {
    toExamEnterResponseDto,
    toStudentExamResponseDto,
    toStudentExamSessionDto
} from './exam-response.dto';

describe('exam-response dto mappers', () => {
    it('returns only student-safe exam fields', () => {
        const mapped = toStudentExamResponseDto({
            id: 'exam-1',
            slug: 'exam-1',
            title: 'Exam 1',
            duration: 30,
            totalMarks: 100,
            examMode: 'Browser',
            aiProctoring: true,
            tabSwitchLimit: 3,
            sections: [{ id: 's1', title: 'A', status: 'active', questions: [] }],
            questions: { Q1: { id: 'Q1', title: 'Question 1' } },
            testCode: 'SECRET',
            allowedIPs: '10.0.0.1',
            creatorId: 'teacher-1'
        });

        expect(mapped.id).toBe('exam-1');
        expect(mapped.title).toBe('Exam 1');
        expect((mapped as any).testCode).toBeUndefined();
        expect((mapped as any).allowedIPs).toBeUndefined();
        expect((mapped as any).creatorId).toBeUndefined();
    });

    it('maps session to safe shape', () => {
        const mapped = toStudentExamSessionDto({
            id: 'sess-1',
            status: 'IN_PROGRESS',
            startTime: '2026-01-01T00:00:00.000Z',
            answers: { Q1: 'A' },
            feedbackDone: true,
            violations: [
                { type: 'TAB_SWITCH_OUT' },
                { type: 'TAB_SWITCH_IN' },
                { type: 'OTHER' }
            ],
            ipAddress: '127.0.0.1',
            userId: 'user-1'
        });

        expect(mapped.id).toBe('sess-1');
        expect(mapped.tabSwitchOutCount).toBe(1);
        expect(mapped.tabSwitchInCount).toBe(1);
        expect((mapped as any).ipAddress).toBeUndefined();
        expect((mapped as any).userId).toBeUndefined();
    });

    it('builds enter response DTO with ready status', () => {
        const mapped = toExamEnterResponseDto({
            id: 'sess-2',
            status: 'IN_PROGRESS',
            startTime: '2026-01-01T00:00:00.000Z'
        });

        expect(mapped.status).toBe('ready');
        expect(mapped.session.id).toBe('sess-2');
    });
});
