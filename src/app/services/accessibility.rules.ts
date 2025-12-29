export interface AccessibilityRule {
    id: string | string[]; // Single valid ID or array of aliases
    apply: (code: string) => string;
}

export const ACCESSIBILITY_RULES: AccessibilityRule[] = [
    {
        id: ['ai-ambiguous-link', 'ambiguous-link'],
        apply: (code) => code.replace(/>\s*(click here|read more|more|here|info)\s*</gi, '>View Details<')
    },
    {
        id: ['image-alt', 'ai-image-alt'],
        apply: (code) => code.replace(/<img\s+(?![^>]*\balt=)([^>]+)>/gi, '<img alt="Image description needed" $1>')
    },
    {
        id: ['button-name', 'ai-button-name'],
        apply: (code) => code.replace(/<button\s+(?![^>]*\baria-label=)([^>]*)>/gi, '<button aria-label="Action Name" $1>')
    },
    {
        id: ['label', 'label-title-only', 'ai-label'],
        apply: (code) => code.replace(/<(input|textarea|select)\s+(?![^>]*\b(aria-label|id|title)=)([^>]+)>/gi, '<$1 aria-label="Input field" $3>')
    },
    {
        id: ['prefer-native-button', 'ai-prefer-native-button'],
        apply: (code) => code.replace(/<(a|div|span)\s+([^>]*?)role=["']button["']([^>]*?)>(.*?)<\/\1>/gis, (match, tag, before, after, content) => {
            let attrs = (before + ' ' + after).replace(/href=["'][^"']*["']\s*/gi, '');
            attrs = attrs.replace(/\s+/g, ' ').trim();
            return `<button type="button" ${attrs}>${content}</button>`;
        })
    },
    {
        id: ['ai-mouse-only-interaction', 'mouse-only-interaction'],
        apply: (code) => code.replace(/<([a-z0-9]+)\s+([^>]*)\(click\)="([^"]+)"([^>]*)>/gi, (match, tag, before, handler, after) => {
            if (['button', 'a', 'input'].includes(tag)) return match;
            if (before.includes('keydown') || after.includes('keydown')) return match;
            return `<${tag} ${before} (click)="${handler}" (keydown.enter)="${handler}" tabindex="0" ${after}>`;
        })
    },
    {
        id: 'aria-hidden-focus',
        apply: (code) => code.replace(/\s?aria-hidden=["']true["']/gi, '')
    },
    {
        id: 'minimize-tabindex',
        apply: (code) => code.replace(/tabindex=["']([1-9][0-9]*)["']/gi, 'tabindex="0"')
    },
    {
        id: 'frame-title',
        apply: (code) => code.replace(/<iframe\s+(?![^>]*\btitle=)([^>]+)>/gi, '<iframe title="Embedded Content" $1>')
    },
    {
        id: 'empty-heading',
        apply: (code) => code.replace(/<(h[1-6])>\s*<\/\1>/gi, '<$1>Heading Title</$1>')
    },
    {
        id: 'focus-obscured',
        apply: (code) => code.replace(/outline:\s*(0|none)\s*;?/gi, 'outline: 2px solid transparent; /* Fix: Visible focus required */')
    },
    {
        id: 'missing-skip-link',
        apply: (code) => {
            if (code.includes('<header')) {
                return code.replace(/<header([^>]*)>/i, '<header$1>\n  <a href="#main" class="sr-only focus:not-sr-only">Skip to main content</a>');
            }
            return code;
        }
    },
    {
        id: ['aria-required-parent', 'aria-allowed-role'],
        apply: (code) => {
            // Step 1: Fix invalid heading roles (h2 role=tab -> div role=tab > h2)
            let fixStage1 = code.replace(/<(h[1-6])\s+([^>]*?)role=["']tab["']([^>]*?)>(.*?)<\/\1>/gis, (match, tag, before, after, content) => {
                const headingAttrs = (before + ' ' + after).replace(/\s+/g, ' ').trim();
                return `<div role="tab"><${tag} ${headingAttrs}>${content}</${tag}></div>`;
            });

            // Step 2: Ensure any role="tab" is wrapped in a role="tablist"
            if (fixStage1.includes('role="tab"') && !fixStage1.includes('role="tablist"')) {
                return `<div role="tablist">\n  ${fixStage1}\n</div>`;
            }
            return fixStage1;
        }
    },
    // --- NEW W3C CLEANUP RULES ---
    {
        id: 'nested-interactive',
        apply: (code) => {
            // Fix: <button> <button>...</button> </button> -> <div class="action-wrapper"> <button>...</button> </div>
            // We use a regex that matches a button wrapping another button immediately (ignoring whitespace)
            return code.replace(/<button([^>]*)>(\s*<button[^>]*>[\s\S]*?<\/button>\s*)<\/button>/gi, '<div$1>$2</div>');
        }
    },
    {
        id: 'redundant-role',
        apply: (code) => {
            // Fix: <button role="button"> -> <button>
            // Fix: <header role="banner"> -> <header>
            // Fix: <main role="main"> -> <main>
            let newCode = code.replace(/<button\s+([^>]*?)role=["']?button["']?([^>]*?)>/gis, '<button $1 $2>');
            newCode = newCode.replace(/<header\s+([^>]*?)role=["']?banner["']?([^>]*?)>/gis, '<header $1 $2>');
            newCode = newCode.replace(/<main\s+([^>]*?)role=["']?main["']?([^>]*?)>/gis, '<main $1 $2>');
            newCode = newCode.replace(/<nav\s+([^>]*?)role=["']?navigation["']?([^>]*?)>/gis, '<nav $1 $2>');
            newCode = newCode.replace(/<aside\s+([^>]*?)role=["']?complementary["']?([^>]*?)>/gis, '<aside $1 $2>');
            newCode = newCode.replace(/<footer\s+([^>]*?)role=["']?contentinfo["']?([^>]*?)>/gis, '<footer $1 $2>');

            // Cleanup extra spaces left by removal
            return newCode.replace(/\s+/g, ' ').replace(/\s>/g, '>');
        }
    },
    {
        id: 'aria-hidden-body',
        apply: (code) => code.replace(/<body([^>]*)aria-hidden=["']true["']([^>]*)>/gi, '<body$1$2>')
    }
];
