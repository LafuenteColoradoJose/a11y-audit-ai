import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, firstValueFrom, forkJoin, of, catchError } from 'rxjs';
import axe from 'axe-core';

export interface AuditIssue {
    id: string;
    ruleId: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
    suggestion: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuditService {
    private http = inject(HttpClient);

    // Local AI Configuration
    // readonly useLocalModel = signal(false); // REMOVED: No longer used



    /**
     * Analyzes the code using axe-core for real WCAG validation and custom checks.
     */
    analyzeCode(code: string, level: string): Observable<AuditIssue[]> {
        // Run Axe (Local Standard)
        const axeCheck$ = from(this.runAxeAudit(code, level)).pipe(
            map(axeResults => {
                const axeIssues = this.mapAxeToAuditIssues(axeResults);
                const customIssues = this.runCustomAudit(code);
                return [...axeIssues, ...customIssues];
            })
        );

        // Run AI Scan (Cloud Gemini)
        const aiCheck$ = this.http.post<{ issues: AuditIssue[] }>('/api/analyze', { code }).pipe(
            map(res => res.issues.map(i => ({
                ...i,
                ruleId: i.ruleId.startsWith('ai-') ? i.ruleId : `ai-${i.ruleId}`,
                id: `ai-${Date.now()}-${Math.random()}`
            }))),
            catchError(err => {
                console.warn('AI Analysis failed (offline or quota), skipping.', err);
                return of([] as AuditIssue[]);
            })
        );

        // Merge both results
        return forkJoin([axeCheck$, aiCheck$]).pipe(
            map(([standardIssues, aiIssues]) => [...standardIssues, ...aiIssues])
        );
    }

    /**
     * Attempts to automatically fix the issue in the provided code snippet.
     * Returns the modified code.
     */
    async applyFix(code: string, issue: AuditIssue): Promise<string> {
        // Option 1: Try to fix via our secure Backend API (Gemini)
        try {
            const response = await firstValueFrom(
                this.http.post<{ fixedCode: string }>('/api/fix', { code, issue })
            );
            return response.fixedCode;
        } catch (error) {
            console.warn('Backend fix failed (offline or error), falling back to Regex rules.', error);
            // Option 2: Fallback to local Regex if backend fails
            return this.applyRegexFix(code, issue);
        }
    }

    private applyRegexFix(code: string, issue: AuditIssue): string {
        let newCode = code;

        switch (issue.ruleId) {
            case 'ai-ambiguous-link':
            case 'ambiguous-link':
                // Rule: Links should describe their purpose
                // Fix: Replace generic text with 'View Details'
                return newCode.replace(/>\s*(click here|read more|more|here|info)\s*</gi, '>View Details<');

            case 'image-alt':
            case 'ai-image-alt':
                // Rule: Images must have alt text
                // Fix: Add alt="Description" to img tags if missing
                return newCode.replace(/<img\s+(?![^>]*\balt=)([^>]+)>/gi, '<img alt="Image description needed" $1>');

            case 'button-name':
            case 'ai-button-name':
                // Rule: Buttons must have discernible text
                // Fix: Add aria-label if text is empty or missing
                return newCode.replace(/<button\s+(?![^>]*\baria-label=)([^>]*)>/gi, '<button aria-label="Action Name" $1>');

            case 'label':
            case 'label-title-only':
            case 'ai-label':
                // Rule: Inputs must have labels
                // Fix: Add aria-label to input/textarea/select
                return newCode.replace(/<(input|textarea|select)\s+(?![^>]*\b(aria-label|id|title)=)([^>]+)>/gi, '<$1 aria-label="Input field" $3>');

            case 'prefer-native-button':
            case 'ai-prefer-native-button':
                // Rule: Use <button> instead of div/span role="button"
                // Fix: Convert tag and add type="button"
                return newCode.replace(/<(a|div|span)\s+([^>]*?)role=["']button["']([^>]*?)>(.*?)<\/\1>/gis, (match, tag, before, after, content) => {
                    let attrs = (before + ' ' + after).replace(/href=["'][^"']*["']\s*/gi, '');
                    attrs = attrs.replace(/\s+/g, ' ').trim();
                    return `<button type="button" ${attrs}>${content}</button>`;
                });

            case 'ai-mouse-only-interaction':
            case 'mouse-only-interaction':
                // Rule: Clickable elements must be keyboard accessible
                // Fix: Add tabindex="0" and (keydown.enter)="handler()" if (click) exists
                // Note: We try to match the handler used in (click) to apply it to (keydown.enter)
                return newCode.replace(/<([a-z0-9]+)\s+([^>]*)\(click\)="([^"]+)"([^>]*)>/gi, (match, tag, before, handler, after) => {
                    // Don't modify if it's already a button or link (native interactive)
                    if (tag === 'button' || tag === 'a' || tag === 'input') return match;
                    // Don't add if already has keydown
                    if (before.includes('keydown') || after.includes('keydown')) return match;

                    return `<${tag} ${before} (click)="${handler}" (keydown.enter)="${handler}" tabindex="0" ${after}>`;
                });

            case 'aria-hidden-focus':
                // Rule: aria-hidden elements should not be focusable
                return newCode.replace(/\s?aria-hidden=["']true["']/gi, '');

            case 'minimize-tabindex':
                // Rule: Avoid positive tabindex
                // Fix: Change positive tabindex to 0
                return newCode.replace(/tabindex=["']([1-9][0-9]*)["']/gi, 'tabindex="0"');

            case 'frame-title':
                // Rule: Iframes must have titles
                // Fix: Add a generic title if missing
                return newCode.replace(/<iframe\s+(?![^>]*\btitle=)([^>]+)>/gi, '<iframe title="Embedded Content" $1>');

            case 'empty-heading':
                // Rule: Headings should not be empty
                // Fix: Add a placeholder title
                return newCode.replace(/<(h[1-6])>\s*<\/\1>/gi, '<$1>Heading Title</$1>');

            case 'focus-obscured':
                // Rule: Focus indicator should not be removed
                // Fix: Replace 'outline: none' or 'outline: 0' with a visible focus ring.
                newCode = newCode.replace(/<(div|span|p|section)\s+([^>]*?)(\(click\)|onclick)=["']([^"']*)["']([^>]*?)>(.*?)<\/\1>/gis, (match, tag, before, eventName, handler, after, content) => {
                    let attrs = (before + ` ${eventName}="${handler}" ` + after).replace(/\s+/g, ' ').trim();
                    return `<button type="button" ${attrs}>${content}</button>`;
                });
                break;
        }

        return newCode;
    }

    private runCustomAudit(code: string): AuditIssue[] {
        const issues: AuditIssue[] = [];

        // Rule: Prefer native <button>
        const roleButtonRegex = /<((?!button|input)\w+)\s+[^>]*\brole=["']button["'][^>]*>/gi;
        let match;
        while ((match = roleButtonRegex.exec(code)) !== null) {
            const tagName = match[1];
            issues.push({
                id: `custom-prefer-native-button-${Date.now()}-${Math.random()}`,
                ruleId: 'prefer-native-button',
                severity: 'medium',
                message: `Avoid using role="button" on <${tagName}> elements. Use the native <button> element instead.`,
                suggestion: `Replace <${tagName} role="button"> with <button>.`
            });
        }

        // Rule: Avoid positive tabindex
        const positiveTabindexRegex = /<(\w+)\s+[^>]*\btabindex=["']([1-9][0-9]*)["'][^>]*>/gi;
        let tabIndexMatch;
        while ((tabIndexMatch = positiveTabindexRegex.exec(code)) !== null) {
            const tagName = tabIndexMatch[1];
            const value = tabIndexMatch[2];
            issues.push({
                id: `custom-minimize-tabindex-${Date.now()}-${Math.random()}`,
                ruleId: 'minimize-tabindex',
                severity: 'medium',
                message: `Avoid using positive tabindex "${value}" on <${tagName}>. It disrupts valid tab order.`,
                suggestion: `Change tabindex="${value}" to tabindex="0" or move the element in the DOM.`
            });
        }

        // Rule: Missing Skip Link
        if (/<header/i.test(code)) {
            const hasSkipLink = /<a\s+[^>]*href=["']#[^"']+["'][^>]*>.*?skip.*?<\/a>/is.test(code);
            if (!hasSkipLink) {
                issues.push({
                    id: `custom-missing-skip-link-${Date.now()}-${Math.random()}`,
                    ruleId: 'missing-skip-link',
                    severity: 'high',
                    message: 'Missing "Skip to main content" link. Users should be able to bypass repeated navigation.',
                    suggestion: 'Add a skip link as the first element in your <header>.'
                });
            }
        }

        // Rule: Focus Obscured (outline: none / 0)
        const focusObscuredRegex = /outline:\s*(none|0)/gi;
        if (focusObscuredRegex.test(code)) {
            issues.push({
                id: `custom-focus-obscured-${Date.now()}-${Math.random()}`,
                ruleId: 'focus-obscured',
                severity: 'high',
                message: 'Avoid "outline: none" or "outline: 0". It makes the element inaccessible to keyboard users.',
                suggestion: 'Replace with "outline: auto 5px -webkit-focus-ring-color" or a visible custom outline.'
            });
        }

        // Rule: Input Missing Autocomplete (WCAG 1.3.5)
        const inputRegex = /<input[^>]*type=["'](email|tel|password|text)["'][^>]*>/gi;
        let inputMatch;
        while ((inputMatch = inputRegex.exec(code)) !== null) {
            const inputTag = inputMatch[0];
            const typeMatcher = inputTag.match(/type=["'](email|tel|password|text)["']/i);
            const type = typeMatcher ? typeMatcher[1].toLowerCase() : 'text';

            const isStrictType = ['email', 'tel', 'password'].includes(type);
            const looksLikePII = /name=["'](name|email|phone|tel|address)["']/i.test(inputTag);

            if ((isStrictType || looksLikePII) && !inputTag.includes('autocomplete')) {
                issues.push({
                    id: `custom-autocomplete-${Date.now()}-${Math.random()}`,
                    ruleId: 'ai-form-autocomplete',
                    severity: 'medium',
                    message: `Input type '${type}' is missing the 'autocomplete' attribute (WCAG 1.3.5).`,
                    suggestion: `Add autocomplete="..." attribute appropriately (e.g. autocomplete="${type}").`
                });
            }
        }

        // Rule: Video Missing Captions (<track>)
        const videoRegex = /<video[^>]*>(?![\s\S]*?<track[^>]*kind=["'](captions|subtitles)["'])[\s\S]*?<\/video>/gi;
        if (videoRegex.test(code)) {
            issues.push({
                id: `custom-video-captions-${Date.now()}-${Math.random()}`,
                ruleId: 'ai-media-captions',
                severity: 'high',
                message: 'Video element is missing captions (<track>). Users with hearing impairments cannot access the content.',
                suggestion: 'Add a <track kind="captions" src="..."> element inside the video tag.'
            });
        }

        // Rule: Audio Missing Transcript Warning
        const audioRegex = /<audio[^>]*>/gi;
        if (audioRegex.test(code) && !code.match(/transcript/i)) {
            issues.push({
                id: `custom-audio-transcript-${Date.now()}-${Math.random()}`,
                ruleId: 'ai-media-transcript',
                severity: 'medium',
                message: 'Audio element detected. Ensure a text transcript is available nearby.',
                suggestion: 'Provide a link to a full text transcript or include it in a <details> block.'
            });
        }

        // Rule: Autoplay Usage
        const autoplayRegex = /<(video|audio)[^>]*autoplay[^>]*>/gi;
        if (autoplayRegex.test(code)) {
            issues.push({
                id: `custom-media-autoplay-${Date.now()}-${Math.random()}`,
                ruleId: 'ai-media-autoplay',
                severity: 'high',
                message: 'Media element uses "autoplay". This can be disruptive and cause accessibility issues.',
                suggestion: 'Remove "autoplay" or ensure controls are present to pause it immediately.'
            });
        }

        // Rule: Mouse-Only Interaction (Click without Keyboard)
        const mouseOnlyRegex = /<(div|span|p|i|section|article)[^>]*?(\s(onclick|\(click\))=)/gi;
        let mouseMatch;
        while ((mouseMatch = mouseOnlyRegex.exec(code)) !== null) {
            const rawTag = mouseMatch[0];
            const hasKeyboard = /(\(keydown\)|\(keyup\)|onkeydown|onkeyup)/i.test(rawTag);

            if (!hasKeyboard) {
                issues.push({
                    id: `custom-mouse-only-${Date.now()}-${Math.random()}`,
                    ruleId: 'ai-mouse-only-interaction',
                    severity: 'high',
                    message: 'Interactive element missing keyboard support. Requires (keydown) or native button.',
                    suggestion: 'Change this element to a <button> or add (keydown.enter) handler.'
                });
            }
        }

        // Rule: Hardcoded Colors (CSS/Style)
        // Detects hex/rgb colors that are NOT custom properties definitions (e.g. --color: #fff is fine, but color: #fff is not)
        // We look for "property: #hex" or "property: rgb(...)" but try to exclude "--variable:"
        const hardcodedColorRegex = /(?<!-)\b(color|background|background-color|border|border-color|fill|stroke)\s*:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-z]+)\b/gi;
        let colorMatch;

        // We limit matches to avoid hundreds of warnings in a full CSS file
        let colorWarningsCount = 0;
        const seenColors = new Set<string>();

        while ((colorMatch = hardcodedColorRegex.exec(code)) !== null && colorWarningsCount < 5) {
            const fullMatch = colorMatch[0];
            const property = colorMatch[1];
            const value = colorMatch[2];

            // Filter out common keywords that are adaptable or safe
            if (['inherit', 'transparent', 'currentColor', 'none', 'initial', 'auto'].includes(value.toLowerCase())) continue;
            if (seenColors.has(value)) continue;

            seenColors.add(value);
            colorWarningsCount++;

            issues.push({
                id: `custom-hardcoded-color-${Date.now()}-${Math.random()}`,
                // Removed 'ai-' prefix to disable Auto-Fix button as color decisions should be manual
                ruleId: 'hardcoded-color',
                severity: 'medium', // Not high because it might be valid branding, but worth warning
                message: `Hardcoded color '${value}' detected for '${property}'. This prevents users from using High Contrast Mode or Dark Mode preferences.`,
                suggestion: `Use CSS Variables (var(--color-name)) or system colors (CanvasText, LinkText) to better support user preferences.`
            });
        }

        // Rule: Absolute Font Size (px)
        const pxFontRegex = /font-size\s*:\s*[0-9]+px\b/gi;
        if (pxFontRegex.test(code)) {
            issues.push({
                id: `custom-px-font-${Date.now()}-${Math.random()}`,
                ruleId: 'absolute-font-size',
                severity: 'medium',
                message: 'Absolute font-size (px) detected. This disables the user\'s browser font size settings.',
                suggestion: 'Use relative units like "rem" or "em" instead of "px". (16px ≈ 1rem)'
            });
        }

        // Rule: Justified Text
        const justifyRegex = /text-align\s*:\s*justify\b/gi;
        if (justifyRegex.test(code)) {
            issues.push({
                id: `custom-justify-text-${Date.now()}-${Math.random()}`,
                ruleId: 'justified-text',
                severity: 'low',
                message: 'Justified text alignment detected. This creates "rivers of whitespace" that are hard to read for dyslexic users.',
                suggestion: 'Use "text-align: left" (or start) for better readability.'
            });
        }

        return issues;
    }

    private async runAxeAudit(startHtml: string, level: string): Promise<axe.Result[]> {
        const container = document.createElement('div');
        container.innerHTML = startHtml;
        // Hide it but keep it accessible to the accessibility tree
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        document.body.appendChild(container);

        try {
            const options: axe.RunOptions = {
                runOnly: {
                    type: 'tag',
                    values: this.getTagsForLevel(level)
                },
                resultTypes: ['violations', 'incomplete']
            };

            const results = await axe.run(container, options);
            return [...results.violations, ...results.incomplete];
        } catch (e) {
            console.error('Axe audit failed', e);
            return [];
        } finally {
            document.body.removeChild(container);
        }
    }

    private getTagsForLevel(level: string): string[] {
        const tags = ['wcag2a'];
        if (level === 'AA' || level === 'AAA') tags.push('wcag2aa');
        if (level === 'AAA') tags.push('wcag2aaa');
        return tags;
    }

    private mapAxeToAuditIssues(results: axe.Result[]): AuditIssue[] {
        return results.map((r, index) => ({
            id: `issue-${index}-${Date.now()}`,
            ruleId: r.id,
            severity: this.mapSeverity(r.impact),
            message: r.help,
            suggestion: `Look at: ${r.nodes.map(n => n.html).join(', ')}. ${r.helpUrl}`
        }));
    }

    private mapSeverity(impact: axe.ImpactValue | undefined | null): 'high' | 'medium' | 'low' {
        switch (impact) {
            case 'critical':
            case 'serious':
                return 'high';
            case 'moderate':
                return 'medium';
            default:
                return 'low';
        }
    }

    // --- Local In-Browser AI Implementation (@xenova/transformers) ---

    // We keep track of the pipeline promise so we reuse it
    private textPipeline: any = null;
    readonly isModelLoading = signal(false);
    readonly modelProgress = signal<string>('');

    private async initLocalModel() {
        if (this.textPipeline) return this.textPipeline;

        this.isModelLoading.set(true);
        this.modelProgress.set('Loading AI Model (approx 250MB)... this happens once.');

        try {
            // Use dynamic import from CDN to avoid build-time node-dependency issues
            // This is a robust workaround for client-side only AI
            // @ts-ignore
            const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');

            // CRITICAL: Disable local model checking to prevent fs/path usage
            env.allowLocalModels = false;
            env.useBrowserCache = true;

            // Using a smaller, instruction-tuned model suitable for browser
            this.textPipeline = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-248M', {
                progress_callback: (d: any) => {
                    if (d.status === 'progress') {
                        this.modelProgress.set(`Downloading: ${Math.round(d.progress)}%`);
                    } else if (d.status === 'ready') {
                        this.modelProgress.set('Model Ready!');
                    }
                }
            });

            return this.textPipeline;
        } catch (e) {
            console.error('Failed to load local model', e);
            throw e;
        } finally {
            this.isModelLoading.set(false);
        }
    }

    private async analyzeWithLocalModel(code: string): Promise<AuditIssue[]> {
        const generator = await this.initLocalModel();

        // Simplified prompt optimized for smaller models (LaMini/Flan-T5)
        const prompt = `
        Identify accessibility errors in this HTML.
        Code: ${code.substring(0, 500)} 
        
        If there is an error, output JSON: [{"ruleId": "error-name", "message": "Short description"}]
        If no error, output: []
        `;

        try {
            this.modelProgress.set('Analyzing code locally...');
            const output = await generator(prompt, {
                max_new_tokens: 150,
                temperature: 0.1, // Low temperature for deterministic output
                do_sample: false
            });

            const text = output[0].generated_text;
            console.log('Local AI Output:', text);

            // Try to find JSON array in the output
            const jsonMatch = text.match(/\[.*\]/s);
            if (jsonMatch) {
                try {
                    const issues = JSON.parse(jsonMatch[0]);
                    return issues.map((i: any) => ({
                        ...i,
                        id: `local-browser-${Date.now()}-${Math.random()}`,
                        suggestion: i.suggestion || 'Check WCAG guidelines.',
                        severity: i.severity || 'medium'
                    }));
                } catch (e) {
                    console.warn('JSON parse failed, falling back to text analysis');
                }
            }

            // Fallback: Keyword detection if model refuses to speak JSON or misses the issue
            const fallbackIssues: AuditIssue[] = [];
            // We check the INPUT CODE, not the AI output, to guarantee detection of obvious bad patterns
            // Ultra-robust Regex: Matches <a ...> ... Click ... Here ... </a>
            // Allows newlines (\s+), attributes ([^>]*), and nested tags in between
            const ambiguousLinkRegex = /<a\s+[^>]*>[\s\S]*?(click\s+here|read\s+more|more\s+info|details)[\s\S]*?<\/a>/i;

            if (ambiguousLinkRegex.test(code)) {
                fallbackIssues.push({
                    id: `local-fallback-${Date.now()}`,
                    ruleId: 'ai-ambiguous-link',
                    severity: 'medium',
                    message: 'Ambiguous link text detected (e.g., "Click here").',
                    suggestion: 'Use descriptive link text that explains the destination.'
                });
            }

            return fallbackIssues;

        } catch (e) {
            console.error('Local AI Inference failed', e);
            return [];
        } finally {
            this.modelProgress.set('');
        }
    }

    private async fixWithLocalModel(code: string, issue: AuditIssue): Promise<string> {
        const generator = await this.initLocalModel();

        // Few-shot prompt: We give examples so the model understands the task
        const prompt = `
        Task: Fix accessibility issues in HTML code. Return ONLY the fixed HTML.

        Example 1:
        Issue: Ambiguous link text
        Input: <a href="#">Click here</a>
        Output: <a href="#">View Details</a>

        Example 2:
        Issue: Images must have alternative text
        Input: <img src="cat.jpg">
        Output: <img src="cat.jpg" alt="A cute cat">

        Current Task:
        Issue: "${issue.message}"
        Input: ${code}
        Output:
        `;

        try {
            this.modelProgress.set('Generating fix locally...');
            const output = await generator(prompt, {
                max_new_tokens: 200,
                temperature: 0.1
            });
            let fixedCode = output[0].generated_text.trim();

            // 1. Cleanup prefixes
            fixedCode = fixedCode.replace(/^Output:\s*/i, '').replace(/^Input:\s*/i, '');
            if (fixedCode.includes('Output:')) {
                fixedCode = fixedCode.split('Output:').pop()?.trim() || fixedCode;
            }

            // 2. Safety Check: If no HTML tags found, trigger fallback
            if (!/<[^>]+>/.test(fixedCode)) {
                console.warn('Local AI returned non-HTML text. Triggering Regex Fallback.', fixedCode);
                throw new Error('Local AI output invalid'); // Throwing forces the applyFix catch block to run
            }

            // 3. Extract purely the HTML part
            const firstTagIndex = fixedCode.search(/<[a-z][\s\S]*>/i);
            if (firstTagIndex !== -1) {
                fixedCode = fixedCode.substring(firstTagIndex);
            }

            return fixedCode;
        } finally {
            this.modelProgress.set('');
        }
    }
}
