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
    analyzeCode(code: string, level: string): Observable<AuditIssue[]> {
        return from(this.runAxeAudit(code, level)).pipe(
            map(axeResults => this.mapAxeToAuditIssues(axeResults))
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
                // Basic regex replacement for the first occurrence or all, simplistic for MVP
                newCode = newCode.replace(/<img\s+(?![^>]*\balt=)([^>]+)>/gi, '<img alt="Description needed" $1>');
                break;

            case 'button-name':
                // Fix: Add aria-label="Action" to buttons if they lack it.
                // We look for the opening <button> tag that doesn't already have an aria-label.
                // This regex matches <button [anything] > and injects aria-label there.
                // It's safer than trying to match the closing tag for nested content.
                newCode = newCode.replace(/<button\s+(?![^>]*\baria-label=)([^>]*)>/gi, '<button aria-label="Action Name" $1>');
                break;

            case 'label':
            case 'label-title-only':
                // Fix: Add aria-label to inputs
                newCode = newCode.replace(/<input\s+(?![^>]*\b(aria-label|id)=)([^>]+)>/gi, '<input aria-label="Input field" $1>');
                break;
        }

        return newCode;
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
