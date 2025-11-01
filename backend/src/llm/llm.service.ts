import { Injectable } from '@nestjs/common';
import { Ollama } from 'ollama';

interface LLMCodeAnalysisResult {
    summary: string;
    overallScore: number;
    effortPoints: number;
    findings: {
        category: string;
        severity: string;
        title: string;
        description: string;
        lineNumber?: number;
        codeSnippet?: string;
        suggestion?: string;
        autoFixCode?: string;
    }[];
}


@Injectable()
export class LlmService {
    private ollama: Ollama
    private readonly model = 'codellama:7b'; // Used codellama:7b before


    constructor() {
        this.ollama = new Ollama({ host: "http://localhost:11434" })
    }


    async analyzeCode(
        code: string,
        language: string,
        fileName?: string,
        customGuidelines?: string
    ): Promise<LLMCodeAnalysisResult> {
        console.log(`Analyzing ${fileName || 'code'} with ${this.model}`);

        const prompt = this.createCodeReviewPrompt(code, language, fileName, customGuidelines);

        try {
            const response = await this.ollama.generate({
                model: this.model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: .4,
                    num_predict: 2000
                }
            });

            const analysis = this.parseResponse(response.response, code);
            console.log(`Analysis complete: ${analysis.findings.length} findings`)

            return analysis;
        }
        catch (error) {
            console.log('LLM Analysis failed: ', error.message);

            return this.getFallbackAnalysis(code);
        }

    }

    private createCodeReviewPrompt(
        code: string,
        language: string,
        fileName?: string,
        customGuidelines?: string,
    ): string {

        const guidelinesSection = customGuidelines
            ? `\n\nCUSTOM CODING GUIDELINES TO ENFORCE:\n${customGuidelines}\n\nPay special attention to these guidelines when reviewing the code.`
            : '';
        return `You are an expert code reviewer. Analyze this ${language} code and provide a full and detailed review.
        
        ${fileName ? `File: ${fileName}` : ''}

        CODE:

        \`\`\`${language}
        ${code}
        \`\`\`

        Consider:
1. Code quality and adherence to best practices
2. Potential bugs or edge cases
3. Performance optimizations
4. Readability and maintainability
5. Any security concerns

Also, take a deeper look at:

1. SECURITY issues (vulnerabilities, injection risks, data exposure, etc.)
2. PERFORMANCE problems (inefficient algorithms, memory leaks, bottlenecks, etc.)
3. BUGS (logic errors, edge cases, null pointer issues, etc.)
4. CODE STYLE (naming conventions, readability, best practices, etc.)
5. DOCUMENTATION (missing comments, unclear function purposes, etc.)

For each issue found, provide:
- Category (security/performance/bugs/style/documentation)
- Severity (ASAP/high/medium/low/info)
- Clear description, short and concise
- Specific line number if applicable
- How to fix it(if it's easy enough; if not give guides/general lines)
- Better code example if possible


Please suggest optimizations to improve its performance(if it's the case). 

For each suggestion, explain the expected improvement and any trade-offs.

This is an example. Format your response as:
SUMMARY: [Overall assessment in 2-3 sentences but not limited if there are important things to say]
SCORE: [0-100, where 100 is perfect code]
EFFORT: [Estimated hours/days to fix all issues]

FINDINGS:
---
CATEGORY: security
SEVERITY: ASAP
TITLE: Hardcoded credentials
DESCRIPTION: Password is hardcoded in plain text. Not safe at all
LINE: 5
FIX: Use environment variables and hash passwords
CODE: const password = process.env.DB_PASSWORD
---
[Repeat for each finding]`;
    }

    private parseResponse(
        response: string,
        originalCode: string,
    ): LLMCodeAnalysisResult {
        const lines = response.split('\n');

        const summaryLine = lines.find((l) => l.startsWith('SUMMARY:'))

        // Extract summary
        const summary = summaryLine ?
            summaryLine.replace('SUMMARY:', '').trim() : 'Code analysis completed.';

        // Extract score for code
        const scoreLine = lines.find((l) => l.startsWith('SCORE:'));
        const scoreMatch = scoreLine?.match(/\d+/); // Regex parsing to get number for overall score
        const overallScore = scoreMatch ? parseInt(scoreMatch[0]) : 75;

        // Extract effort needed to fix/solve issue/-s

        const effortLine = lines.find((l) => l.startsWith('EFFORT:'));
        const effortMatch = effortLine?.match(/\d+/);
        const effortPoints = effortMatch ? parseInt(effortMatch[0]) : 5;

        const findings = this.extractFindings(response, originalCode);


        const overallScoreLimit = Math.min(100, Math.max(0, overallScore)) // Limit 0 - 100
        const effortPointsLimit = Math.max(1, effortPoints) // Minimum 1h

        return {
            summary,
            overallScore: overallScoreLimit, // Limit 0-100
            effortPoints: effortPointsLimit,
            findings
        }
    }
    private extractFindings(response: string, code: string): any[] {
        const findings: any[] = [];
        const sections = response.split('---').filter((s) => s.trim());

        for (const section of sections) {
            if (!section.includes('CATEGORY:')) continue;

            const finding: any = {};

            // Extracting fields using RegEx
            const categoryMatch = section.match(/CATEGORY:\s*(.+)/i);
            const severityMatch = section.match(/SEVERITY:\s*(.+)/i);
            const titleMatch = section.match(/TITLE:\s*(.+)/i);
            const descriptionMatch = section.match(/DESCRIPTION:\s*(.+)/i);
            const lineMatch = section.match(/LINE:\s*(.+)/i);
            const fixMatch = section.match(/FIX:\s*(.+)/i);
            const codeMatch = section.match(/CODE:\s*(.+)/is);

            finding.category = categoryMatch?.[1]?.trim().toLowerCase() || 'style';
            finding.severity = severityMatch?.[1]?.trim().toLowerCase() || 'low';
            finding.title = titleMatch?.[1]?.trim() || 'Code improvement needed';
            finding.description = descriptionMatch?.[1]?.trim() || 'Please review this section';

            const lineStr = lineMatch?.[1]?.trim();
            if (lineStr && lineStr !== 'general') {
                const lineNum = parseInt(lineStr);
                if (!isNaN(lineNum)) {
                    finding.lineNumber = lineNum;
                    finding.codeSnippet = this.getCodeSnippet(code, lineNum);
                }
            }

            finding.suggestion = fixMatch?.[1]?.trim() || 'Cannot suggest for the specific code.';
            finding.autoFixCode = codeMatch?.[1]?.trim() || null;

            findings.push(finding);
        }

        // Making sure there is at least one finding
        if (findings.length === 0) {
            findings.push({
                category: 'style',
                severity: 'info',
                title: 'Code reviewed',
                description: `Analyzed ${code.split('\n').length} lines of code.`,
                suggestion: 'Follow language-specific best practices.',
            });
        }

        return findings;
    }

    private getCodeSnippet(code: string, lineNumber: number): string {
        const lines = code.split('\n');
        const start = Math.max(0, lineNumber - 2);
        const end = Math.min(lines.length, lineNumber + 1);
        return lines.slice(start, end).join('\n');
    }

    private getFallbackAnalysis(code: string): LLMCodeAnalysisResult {
        const lineCount = code.split('\n').length;

        return {
            summary: 'Automated analysis completed. Local LLM may not be running. Check Ollama service.',
            overallScore: 70,
            effortPoints: 3,
            findings: [
                {
                    category: 'style',
                    severity: 'info',
                    title: 'Code received for review',
                    description: `Analyzed ${lineCount} lines. Manual review recommended. Ensure Ollama is running with: 'ollama serve'`,
                    suggestion: 'Start Ollama service and try again.',
                },
            ],
        };
    }

    async healthCheck(): Promise<boolean> {
        try {
            const models = await this.ollama.list();
            const hasModel = models.models.some((m) =>
                m.name.includes(this.model.split(':')[0])
            );
            return hasModel;
        } catch (error) {
            console.error('Ollama health check failed:', error.message);
            return false;
        }
    }
}


