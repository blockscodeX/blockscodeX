import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CodeExecutionService } from './code-execution.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('code')
@UseGuards(JwtAuthGuard)
export class CodeExecutionController {
    constructor(private readonly codeExecutionService: CodeExecutionService) { }

    @Post('run')
    async run(@Body() body: { language: string; code: string; input?: string }) {
        return this.codeExecutionService.runCode(
            body.language,
            body.code,
            body.input || '',
        );
    }

    @Post('submit')
    async submit(@Body() body: { unitId: string; language: string; code: string; examId?: string; testCases?: any[] }) {
        return this.codeExecutionService.submitCode(
            body.unitId,
            body.language,
            body.code,
            body.examId,
            body.testCases
        );
    }
}
