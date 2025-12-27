import { Injectable, inject } from '@angular/core';
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

        // Run Gemini (AI Deep Scan)
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
    /**
     * Attempts to automatically fix the issue in the provided code snippet.
     * Returns the modified code.
     */
    async applyFix(code: string, issue: AuditIssue): Promise<string> {
        // Option 1: Try to fix via our secure Backend API (Gemini)
        try {
            // We use fetch purely to avoid Observable conversion for this simple async task,
            // but you could use this.http.post with firstValueFrom too.
            // Using relative path '/api/fix' works automatically with Vercel or local proxy.
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
            case 'image-alt':
                // Fix: Add alt="" to img tags that don't have it
                newCode = newCode.replace(/<img\s+(?![^>]*\balt=)([^>]+)>/gi, '<img alt="Description needed" $1>');
                break;

            case 'button-name':
                // Fix: Add aria-label="Action" to buttons if they lack it.
                newCode = newCode.replace(/<button\s+(?![^>]*\baria-label=)([^>]*)>/gi, '<button aria-label="Action Name" $1>');
                break;

            case 'label':
            case 'label-title-only':
                // Fix: Add aria-label to inputs
                newCode = newCode.replace(/<input\s+(?![^>]*\b(aria-label|id)=)([^>]+)>/gi, '<input aria-label="Input field" $1>');
                break;

            case 'prefer-native-button':
                // Fix: Replace <a|div|span role="button"> with <button type="button">
                // This regex captures the tag name (1), attributes before role (2), attributes after role (3), and content (4)
                newCode = newCode.replace(/<(a|div|span)\s+([^>]*?)role=["']button["']([^>]*?)>(.*?)<\/\1>/gis, (match, tag, before, after, content) => {
                    let attrs = (before + ' ' + after).replace(/href=["'][^"']*["']\s*/gi, ''); // Remove href if it was an <a>
                    attrs = attrs.replace(/\s+/g, ' ').trim();
                    return `<button type="button" ${attrs}>${content}</button>`;
                });
                break;

            case 'aria-hidden-focus':
                // Fix: Remove aria-hidden="true"
                newCode = newCode.replace(/\s?aria-hidden=["']true["']/gi, '');
                break;

            case 'minimize-tabindex':
                // Fix: Replace tabindex="[1-9]*" with tabindex="0"
                newCode = newCode.replace(/tabindex=["']([1-9][0-9]*)["']/gi, 'tabindex="0"');
                break;

            case 'missing-skip-link':
                // Fix: Prepend the skip link to the <header>
                const skipLink = '\n  <a href="#main" class="sr-only focus:not-sr-only">Skip to main content</a>';
                newCode = newCode.replace(/<header([^>]*)>/i, '<header$1>' + skipLink);
                break;

            case 'focus-obscured':
                // Fix: Replace 'outline: none' or 'outline: 0' with a visible focus ring.
                newCode = newCode.replace(/outline:\s*(none|0)\s*;?/gi, 'outline: auto 5px -webkit-focus-ring-color;');
                break;

            case 'ai-media-autoplay':
                // Fix: Remove 'autoplay' attribute
                newCode = newCode.replace(/\s*autoplay(=["'][^"']*["'])?/gi, '');
                break;

            case 'ai-media-captions':
                // Fix: Inject <track> inside <video>
                newCode = newCode.replace(/(<video[^>]*>)/gi, '$1\n  <track kind="captions" src="captions.vtt" srclang="en" label="English Captions">');
                break;

            case 'ai-media-transcript':
                // Fix: Append a Transcript placeholder after <audio>
                newCode = newCode.replace(/(<\/audio>)/gi, '$1\n<details class="mt-2">\n  <summary class="cursor-pointer text-blue-600">Read Transcript</summary>\n  <div class="p-2 bg-gray-50 border rounded">\n    <p>[Insert full transcript here...]</p>\n  </div>\n</details>');
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
            // Check if there is a link that looks like a skip link inside the header or just before nav
            // Simplistic check: look for <a> with "skip" in text or href starting with #
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

            // Only flag strictly required fields or if it looks clearly like PII (name/email attribute)
            const isStrictType = ['email', 'tel', 'password'].includes(type);
            const looksLikePII = /name=["'](name|email|phone|tel|address)["']/i.test(inputTag);

            if ((isStrictType || looksLikePII) && !inputTag.includes('autocomplete')) {
                issues.push({
                    id: `custom-autocomplete-${Date.now()}-${Math.random()}`,
                    // Use 'ai-form-autocomplete' so the checker enables the Auto-Fix button!
                    ruleId: 'ai-form-autocomplete',
                    severity: 'medium',
                    message: `Input type '${type}' is missing the 'autocomplete' attribute (WCAG 1.3.5).`,
                    suggestion: `Add autocomplete="..." attribute appropriately (e.g. autocomplete="${type}").`
                });
            }
        }

        // Rule: Video Missing Captions (<track>)
        // Matches <video ...> that does NOT contain <track ... kind="captions|subtitles">
        const videoRegex = /<video[^>]*>(?![\s\S]*?<track[^>]*kind=["'](captions|subtitles)["'])[\s\S]*?<\/video>/gi;
        if (videoRegex.test(code)) {
            issues.push({
                id: `custom-video-captions-${Date.now()}-${Math.random()}`,
                ruleId: 'ai-media-captions', // Use 'ai-' prefix to enable Auto-Fix
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
                ruleId: 'ai-media-transcript', // Changed to 'ai-' to enable Auto-Fix
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
                ruleId: 'ai-media-autoplay', // Auto-Fix can remove autoplay
                severity: 'high',
                message: 'Media element uses "autoplay". This can be disruptive and cause accessibility issues.',
                suggestion: 'Remove "autoplay" or ensure controls are present to pause it immediately.'
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
}
