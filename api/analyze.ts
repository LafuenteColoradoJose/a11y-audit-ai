import * as dotenv from 'dotenv';
import * as path from 'path';

// Force load .env.local because Vercel Dev sometimes misses it in function context
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code } = req.body;
    const apiKey = process.env['GEMINI_API_KEY'];

    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY missing' });
    }

    try {
        const prompt = `
        You are an expert Accessibility Auditor (WCAG 2.1 AA).
        Analyze the following HTML code and find subtle accessibility issues that automated tools (like axe-core) might miss.
        
        Specifically look for:
        1. "Language of parts": Text phrases in a foreign language that are not wrapped in a <span lang="..."> tag. (SC 3.1.2)
        2. Iframe accessibility: Missing titles or bad titles.
        3. Reading order or logic issues.
        4. Ambiguous link text (e.g. "click here").
        5. FORMS - CRITICAL CHECKS:
           - You MUST REPORT missing 'autocomplete' attributes on fields like: name, email, tel, address, username, new-password, current-password. This is a WCAG 1.3.5 VIOLATION.
           - You MUST REPORT usage of <div role="form">. Suggest using <form> instead.
           - Labels not programmatically connected to inputs (for/id match).
           - Missing fieldset/legend for related radio buttons or checkboxes.
        
        INPUT CODE:
        ${code}
        
        INSTRUCTIONS:
        Return a JSON array of issues. Do NOT return markdown. Return ONLY raw JSON.
        If strict compliance is not met, generates an issue.
        Format:
        [
            {
                "ruleId": "ai-form-autocomplete",
                "severity": "medium", 
                "message": "Input type 'email' is missing the 'autocomplete' attribute (WCAG 1.3.5).",
                "suggestion": "Add autocomplete='email'."
            }
        ]
        If no issues found, return [].
        `;

        // Using 'gemini-flash-latest' for speed and stability
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API Error: ${response.statusText}`);
        }

        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

        // Clean markdown code blocks if present
        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '');

        const issues = JSON.parse(text);
        return res.status(200).json({ issues });

    } catch (error: any) {
        console.error('AI Analysis Error:', error);
        // Fallback to empty array so the app doesn't crash on AI failure
        return res.status(200).json({ issues: [] });
    }
}
