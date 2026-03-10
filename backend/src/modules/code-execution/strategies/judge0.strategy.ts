import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IExecutionStrategy, ExecutionResult } from './execution-strategy.interface';

@Injectable()
export class Judge0Strategy implements IExecutionStrategy {
    private readonly judge0Url: string;
    private readonly logger = new Logger(Judge0Strategy.name);

    // Mappings from frontend language strings to Judge0 CE language IDs
    // References popular languages. See full Judge0 CE language map at their docs.
    private readonly languageMap: Record<string, number> = {
        'javascript': 93, // Node.js 18.15.0
        'typescript': 94, // TypeScript 5.0.3
        'python': 71,     // Python 3.11.2
        'java': 91,       // Java (JDK 17.0.6)
        'c': 50,          // C (GCC 9.2.0)
        'cpp': 54,        // C++ (GCC 9.2.0)
        'csharp': 51,     // C# (Mono 6.6.0.161)
        'go': 95,         // Go 1.18.5
        'rust': 73,       // Rust 1.68.2
        'php': 68,        // PHP 7.4.1
        'ruby': 72,       // Ruby 2.7.0
        'perl': 85,       // Perl 5.36.0
        'swift': 83,      // Swift 5.2.3
        'kotlin': 78,     // Kotlin 1.3.70
        'scala': 81,      // Scala 2.13.2
        'dart': 90,       // Dart 2.19.6
        'bash': 46,       // Bash 5.0.0
        'powershell': 86, // PowerShell 7.1.4
        'r': 80,          // R 4.0.0
        'lua': 64,        // Lua 5.3.5
        'haskell': 61,    // Haskell (GHC 8.8.1)
        'erlang': 58,     // Erlang (OTP 22.2)
        'clojure': 86,    // Clojure 1.10.1 (Using 86 as proxy, may need adjustment based on specific Judge0 server)
        'cobol': 77,      // COBOL (GnuCOBOL 2.2.0)
        'd': 56,          // D (DMD 2.089.1)
        'fortran': 59,    // Fortran (GFortran 9.2.0)
        'groovy': 88,     // Groovy 3.0.3
        'ocaml': 65,      // OCaml 4.09.0
        'pascal': 67,     // Pascal (FPC 3.0.4)
        'nim': 96,        // Nim 1.6.14 (CE equivalent if available, fallback might be needed)
        'julia': 101,     // Julia 1.8.5
        'crystal': 100,     // Crystal (If supported by server)
        'sqlite3': 82,    // SQLite 3.31.1
    };

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.judge0Url = this.configService.get<string>('JUDGE0_API_URL') || 'http://localhost:2358';
    }

    async execute(language: string, code: string, stdin: string = ''): Promise<ExecutionResult> {
        const languageId = this.languageMap[language.toLowerCase()];

        if (!languageId) {
            this.logger.error(`Language format not supported by Judge0 mapping: ${language}`);
            throw new InternalServerErrorException(`Language '${language}' is not currently supported for execution.`);
        }

        try {
            // POST /submissions?base64_encoded=false&wait=true
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.judge0Url}/submissions?base64_encoded=false&wait=true`,
                    {
                        source_code: code,
                        language_id: languageId,
                        stdin: stdin,
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                ),
            );

            const judge0Result = response.data;

            // Judge0 usually returns stdout, stderr, compile_output, status
            // We map this to our ExecutionResult
            // Map status id to exit code for our legacy system 
            // 3 = Accepted (exit code 0), anything else is an error code
            const exitCode = judge0Result.status?.id === 3 ? 0 : 1;

            // Format an output string that resembles Piston's combined output
            let combinedOutput = '';

            if (judge0Result.compile_output) {
                combinedOutput += judge0Result.compile_output + '\n';
            }
            if (judge0Result.stdout) {
                combinedOutput += judge0Result.stdout;
            }
            if (judge0Result.stderr) {
                combinedOutput += judge0Result.stderr;
            }

            const result: ExecutionResult = {
                stdout: judge0Result.stdout || '',
                stderr: (judge0Result.compile_output || '') + (judge0Result.stderr ? '\n' + judge0Result.stderr : ''),
                output: combinedOutput.trim(),
                code: exitCode,
                signal: judge0Result.status?.description || judge0Result.error || '',
            };

            return result;
        } catch (error: any) {
            const status = error.response?.status;
            const data = error.response?.data;
            this.logger.error(`Judge0 Execution Error [${status}]:`, data || error.message);

            if (status === 429) {
                throw new InternalServerErrorException('Rate limit exceeded for code execution service. Please try again later.');
            }

            throw new InternalServerErrorException('Failed to execute code via Judge0');
        }
    }
}
