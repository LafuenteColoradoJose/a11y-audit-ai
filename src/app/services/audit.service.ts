import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
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
                newCode = newCode.replace(/<a\s+([^>]*?)role=["']button["']([^>]*?)>(.*?)<\/a>/gis, (match, before, after, content) => {
                    let attrs = (before + ' ' + after).replace(/href=["'][^"']*["']\s*/gi, '');
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
