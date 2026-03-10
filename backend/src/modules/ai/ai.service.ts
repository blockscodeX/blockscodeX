import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
    private readonly apiKey: string;
    private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('GROQ_API_KEY') || this.configService.get<string>('GROK_API_KEY') || '';
    }

    async generateObject(systemPrompt: string, userPrompt: string, schema: any): Promise<any> {
        if (!this.apiKey) {
            throw new HttpException('API Key (GROQ_API_KEY) is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        try {
            const finalSystemPrompt = systemPrompt + '\n\nYou MUST return a valid JSON object matching this schema exactly. Do NOT wrap the JSON in markdown blocks (e.g. ```json). JUST return the raw parseable JSON object:\n' + JSON.stringify(schema, null, 2);

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: finalSystemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.7,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Grok API Error:', response.status, errorText);
                throw new HttpException(`Failed to generate content: ${response.statusText}`, HttpStatus.BAD_GATEWAY);
            }

            const data = await response.json();

            const contentStr = data.choices[0]?.message?.content;
            if (!contentStr) {
                throw new HttpException('Empty response from AI', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            let parsedContent;
            try {
                parsedContent = JSON.parse(contentStr);
            } catch (e) {
                console.error("Failed to parse AI JSON response", contentStr);
                throw new HttpException('Invalid JSON format from AI', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            return {
                result: parsedContent,
                tokenUsage: {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0,
                }
            };
        } catch (error: any) {
            console.error('Error in AiService.generateObject:', error);
            throw new HttpException(error.message || 'Internal AI Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Define schemas here to be used by the controller
    getCourseOutlineSchema() {
        return {
            type: "object",
            properties: {
                sections: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            title: { type: "string", description: "Name of the section/module" },
                            description: { type: "string", description: "Brief description of the section" },
                            questions: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        title: { type: "string", description: "Question title or topic" },
                                        type: { type: "string", enum: ["MCQ", "MultiSelect", "Coding", "Web", "Reading", "Notebook"] },
                                        intent: { type: "string", description: "What this question aims to teach/test" }
                                    },
                                    required: ["id", "title", "type", "intent"],
                                    additionalProperties: false
                                }
                            }
                        },
                        required: ["id", "title", "description", "questions"],
                        additionalProperties: false
                    }
                }
            },
            required: ["sections"],
            additionalProperties: false
        };
    }

    getFullCourseSchema() {
        // This schema needs to exactly match the Question type required by CourseBuilder
        return {
            type: "object",
            properties: {
                courseSummary: {
                    type: "string",
                    description: "A comprehensive cheat sheet or syllabus summarizing the entire course content."
                },
                sections: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            title: { type: "string" },
                            questions: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        title: { type: "string" },
                                        type: { type: "string", enum: ["MCQ", "MultiSelect", "Coding", "Web", "Reading", "Notebook"] },
                                        problemStatement: { type: "string", description: "HTML/Richtext content of the problem. Must be engaging and well-formatted with lists, bold text, and code snippets where appropriate." },
                                        marks: { type: "number" },
                                        difficulty: { type: "string", enum: ["Beginner", "Medium", "Advanced"] },
                                        tags: { type: "array", items: { type: "string" } },
                                        options: {
                                            type: ["array", "null"],
                                            description: "MUST HAVE AT LEAST 4 OPTIONS for MCQ/MultiSelect questions. Do not provide less than 4.",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    id: { type: "string" },
                                                    text: { type: "string" },
                                                    isCorrect: { type: "boolean" }
                                                },
                                                required: ["id", "text", "isCorrect"],
                                                additionalProperties: false
                                            }
                                        },
                                        codingConfig: {
                                            type: ["object", "null"],
                                            description: "Configuration for Coding type questions",
                                            properties: {
                                                templates: {
                                                    type: "object",
                                                    description: "Map of language slugs to templates (e.g. 'javascript', 'python')",
                                                    additionalProperties: {
                                                        type: "object",
                                                        properties: {
                                                            head: { type: "string", description: "Code before student's code (hidden)" },
                                                            body: { type: "string", description: "Starter code" },
                                                            tail: { type: "string", description: "Code after student's code (hidden)" },
                                                            solution: { type: "string", description: "Model solution" }
                                                        },
                                                        required: ["head", "body", "tail", "solution"],
                                                        additionalProperties: false
                                                    }
                                                },
                                                testCases: {
                                                    type: "array",
                                                    description: "Exactly 3 to 6 test cases to validate student's code. You MUST provide at least 3 testcases. Never provide just 1.",
                                                    items: {
                                                        type: "object",
                                                        properties: {
                                                            input: { type: "string" },
                                                            output: { type: "string" },
                                                            isPublic: { type: "boolean", description: "True if test case is visible to student" },
                                                            points: { type: "number", description: "Points awarded for passing this test case" }
                                                        },
                                                        required: ["input", "output", "isPublic", "points"],
                                                        additionalProperties: false
                                                    }
                                                }
                                            },
                                            required: ["templates", "testCases"],
                                            additionalProperties: false
                                        },
                                        webConfig: {
                                            type: ["object", "null"],
                                            properties: {
                                                html: { type: "string" },
                                                css: { type: "string" },
                                                js: { type: "string" },
                                                showFiles: {
                                                    type: "object",
                                                    properties: { html: { type: "boolean" }, css: { type: "boolean" }, js: { type: "boolean" } },
                                                    required: ["html", "css", "js"],
                                                    additionalProperties: false
                                                },
                                                testCases: { type: "array" }
                                            },
                                            required: ["html", "css", "js", "showFiles"],
                                            additionalProperties: false
                                        },
                                        readingConfig: {
                                            type: ["object", "null"],
                                            description: "Configuration for Reading type questions",
                                            properties: {
                                                contentBlocks: {
                                                    type: "array",
                                                    items: {
                                                        type: "object",
                                                        properties: {
                                                            id: { type: "string" },
                                                            type: { type: "string", enum: ["text", "code-runner"] },
                                                            content: { type: "string", description: "HTML for text blocks. Empty for code-runner." },
                                                            runnerConfig: {
                                                                type: ["object", "null"],
                                                                description: "Required if type is 'code-runner'",
                                                                properties: {
                                                                    language: { type: "string", enum: ["javascript", "python", "java", "cpp"] },
                                                                    initialCode: { type: "string" }
                                                                },
                                                                required: ["language", "initialCode"],
                                                                additionalProperties: false
                                                            }
                                                        },
                                                        required: ["id", "type", "content"],
                                                        additionalProperties: false
                                                    }
                                                }
                                            },
                                            required: ["contentBlocks"],
                                            additionalProperties: false
                                        },
                                        notebookConfig: {
                                            type: ["object", "null"],
                                            description: "Configuration for Notebook type questions",
                                            properties: {
                                                initialCode: { type: "string" },
                                                language: { type: "string", enum: ["python"] },
                                                maxExecutionTime: { type: "number" },
                                                allowedLibraries: { type: "array", items: { type: "string" } }
                                            },
                                            required: ["initialCode", "language"],
                                            additionalProperties: false
                                        }
                                    },
                                    required: ["id", "title", "type", "problemStatement", "marks"],
                                    additionalProperties: true
                                }
                            }
                        },
                        required: ["id", "title", "questions"],
                        additionalProperties: false
                    }
                }
            },
            required: ["courseSummary", "sections"],
            additionalProperties: false
        };
    }

    getExamOutlineSchema() {
        return {
            type: "object",
            properties: {
                sections: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            title: { type: "string", description: "Name of the exam section" },
                            questions: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        title: { type: "string", description: "Question concept being tested" },
                                        type: { type: "string", enum: ["MCQ", "MultiSelect", "Coding", "Web", "Notebook"] },
                                        intent: { type: "string" },
                                        marks: { type: "number" }
                                    },
                                    required: ["id", "title", "type", "intent", "marks"],
                                    additionalProperties: false
                                }
                            }
                        },
                        required: ["id", "title", "questions"],
                        additionalProperties: false
                    }
                }
            },
            required: ["sections"],
            additionalProperties: false
        };
    }

    getFullExamSchema() {
        // Same structure as course questions but wrapped differently. No courseSummary needed for exam.
        const fullCourseSchema = this.getFullCourseSchema();
        // @ts-ignore
        const sections = fullCourseSchema.properties.sections;
        return {
            type: "object",
            properties: {
                sections: sections
            },
            required: ["sections"],
            additionalProperties: false
        };
    }
}
