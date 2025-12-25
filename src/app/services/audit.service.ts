import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import axe from 'axe-core';

export interface AuditIssue {
    id: string; // Unique ID for tracking
    ruleId: string; // Axe rule ID (e.g., 'image-alt')
    severity: 'high' | 'medium' | 'low';
    message: string;
    suggestion: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuditService {

    /**
     * Analyzes the code using axe-core for real WCAG validation.
     */
    /**
     * Analyzes the code using axe-core for real WCAG validation and custom checks.
     */
    analyzeCode(code: string, level: string): Observable<AuditIssue[]> {
        return from(this.runAxeAudit(code, level)).pipe(
            map(axeResults => {
                const axeIssues = this.mapAxeToAuditIssues(axeResults);
                const customIssues = this.runCustomAudit(code);
                return [...axeIssues, ...customIssues];
            })
        );
    }

    /**
     * Attempts to automatically fix the issue in the provided code snippet.
     * Returns the modified code.
     */
    applyFix(code: string, issue: AuditIssue): string {
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
                // Fix: Replace <a role="button"> with <button type="button">
                // Strategy: Find the tag, replace opening <a... > with <button type="button"... > (removing role=button)
                // and replace closing </a> with </button>.
                // Note: deeply nested <a> tags might be tricky with regex, but standard singular replacements work for simple cases.

                // 1. Remove role="button" and href from opening tag, change valid attributes if needed.
                // We'll do a robust generic replacement for the specific line/block if possible, but global replace is safer for MVP demos.

                // transform <a ... role="button" ...> content </a>  ->  <button type="button" ...> content </button>
                // We remove 'role="button"' and 'href="..."' from the attributes.
                newCode = newCode.replace(/<a\s+([^>]*?)role=["']button["']([^>]*?)>(.*?)<\/a>/gis, (match, before, after, content) => {
                    // Clean attributes: remove href if present
                    let attrs = (before + ' ' + after).replace(/href=["'][^"']*["']\s*/gi, '');
                    // Clean double spaces
                    attrs = attrs.replace(/\s+/g, ' ').trim();
                    return `<button type="button" ${attrs}>${content}</button>`;
                });
                break;

            case 'aria-hidden-focus':
                // Fix: Remove aria-hidden="true" because it shouldn't be on containers with focusable elements
                newCode = newCode.replace(/\s?aria-hidden=["']true["']/gi, '');
                break;

            case 'minimize-tabindex':
                // Fix: Replace tabindex="[1-9]*" with tabindex="0"
                // We want to avoid negative numbers (tabindex="-1") here, targeting only positives
                newCode = newCode.replace(/tabindex=["']([1-9][0-9]*)["']/gi, 'tabindex="0"');
                break;

            case 'missing-skip-link':
                // Fix: Prepend the skip link to the <header>
                // We assume <header> exists because the rule triggered.
                // We use a CSS class 'sr-only' (screen reader only) which is standard in Tailwind/Bootstrap
                // 'focus:not-sr-only' allows it to appear when focused.
                const skipLink = '\n  <a href="#main" class="sr-only focus:not-sr-only">Skip to main content</a>';
                newCode = newCode.replace(/<header([^>]*)>/i, '<header$1>' + skipLink);
                break;

            case 'focus-obscured':
                // Fix: Replace 'outline: none' or 'outline: 0' with a visible focus ring.
                newCode = newCode.replace(/outline:\s*(none|0)\s*;?/gi, 'outline: auto 5px -webkit-focus-ring-color;');
                break;
        }

        return newCode;
    }

    private runCustomAudit(code: string): AuditIssue[] {
        const issues: AuditIssue[] = [];

        // Rule: Prefer native <button>
        // Use a RegEx to find <(tag) ... role="button" ...> where tag is NOT button or input
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
        // Regex to find tabindex="[1-9][0-9]*"
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
        // Check if <header> exists
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
        // Detects explicit removal of focus outline in style attributes or style blocks
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

        return issues;
    }

    private async runAxeAudit(startHtml: string, level: string): Promise<axe.Result[]> {
        // 1. Create a sandbox container
        const container = document.createElement('div');
        container.innerHTML = startHtml;
        // Hide it but keep it accessible to the accessibility tree
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        document.body.appendChild(container);

        try {
            // 2. Configure Axe
            const options: axe.RunOptions = {
                runOnly: {
                    type: 'tag',
                    values: this.getTagsForLevel(level)
                },
                resultTypes: ['violations', 'incomplete']
            };

            // 3. Run Axe
            const results = await axe.run(container, options);
            return [...results.violations, ...results.incomplete];
        } catch (e) {
            console.error('Axe audit failed', e);
            return [];
        } finally {
            // 4. Cleanup
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
