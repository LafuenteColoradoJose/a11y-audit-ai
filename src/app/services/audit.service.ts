import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, firstValueFrom, forkJoin, of, catchError } from 'rxjs';
import axe from 'axe-core';
import { ACCESSIBILITY_RULES } from './accessibility.rules';

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
    readonly useLocalModel = signal(false);



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

        // Run AI Scan (Cloud Gemini OR Local Python)
        let aiCheck$: Observable<AuditIssue[]>;

        if (this.useLocalModel()) {
            aiCheck$ = from(this.analyzeWithLocalModel(code));
        } else {
            aiCheck$ = this.http.post<{ issues: AuditIssue[] }>('/api/analyze', { code }).pipe(
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
        }

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
        // Option 0: Local Python Model (Custom)
        if (this.useLocalModel()) {
            return this.fixWithLocalModel(code, issue);
        }

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
        const rule = ACCESSIBILITY_RULES.find(r =>
            Array.isArray(r.id) ? r.id.includes(issue.ruleId) : r.id === issue.ruleId
        );

        if (rule) {
            return rule.apply(code);
        }

        console.warn(`No regex fix rule found for: ${issue.ruleId}`);
        return code;
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

        // Rule: Redundant ARIA Role
        // Fix: Updated regex to allow optional quotes (role=button vs role="button")
        const redundantRoleRegex = /<(button|header|footer|main|nav|aside|article|section)[^>]*\brole=["']?(button|banner|contentinfo|main|navigation|complementary|article|region)["']?[^>]*>/gi;
        let redundantMatch;
        while ((redundantMatch = redundantRoleRegex.exec(code)) !== null) {
            const tag = redundantMatch[1];
            const role = redundantMatch[2];

            // Validate explicit redundancies mappings
            const redundancyMap: Record<string, string> = {
                'button': 'button',
                'header': 'banner',
                'footer': 'contentinfo', // technically only if not inside article/section, but good warning
                'main': 'main',
                'nav': 'navigation',
                'aside': 'complementary',
                'article': 'article',
                'section': 'region' // only if labeled, but generic warning is okay
            };

            if (redundancyMap[tag] === role) {
                issues.push({
                    id: `custom-redundant-role-${Date.now()}-${Math.random()}`,
                    ruleId: 'redundant-role', // This matches the ID in accessibility.rules.ts and the Checker allowlist
                    severity: 'low',
                    message: `Redundant role detected: <${tag} role="${role}">. The HTML element already implies this semantic.`,
                    suggestion: `Remove the 'role' attribute: <${tag}>.`
                });
            }
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

    // --- Local Custom Model Integration (Python Server) ---

    private localApiUrl = 'http://localhost:8000/api';

    private async analyzeWithLocalModel(code: string): Promise<AuditIssue[]> {
        // The Python server currently returns empty issues for analysis as it is a generative model
        // We keep the method for future extensibility if the python model supports analysis
        try {
            const response = await firstValueFrom(
                this.http.post<{ issues: any[] }>(`${this.localApiUrl}/analyze`, { code })
            );
            return response.issues || [];
        } catch (error) {
            console.warn('Local Python Server not reachable:', error);
            return [];
        }
    }

    private async fixWithLocalModel(code: string, issue: AuditIssue): Promise<string> {
        try {
            const response = await firstValueFrom(
                this.http.post<{ fixedCode: string }>(`${this.localApiUrl}/fix`, {
                    code,
                    issue // Pass the full issue context to the server
                })
            );
            return response.fixedCode || code;
        } catch (error) {
            console.error('Error calling Local Python Server:', error);
            // Fallback to original code if server fails
            return code;
        }
    }
}
