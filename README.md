# 🤖 AI Accessibility Auditor

> **An intelligent auditing tool designed to detect and automatically fix Web Accessibility (WCAG) issues in HTML and Angular applications.**

![Angular Version](https://img.shields.io/badge/Angular-v21-dd0031?style=flat-square&logo=angular)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38b2ac?style=flat-square&logo=tailwind-css)
![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-8E75B2?style=flat-square&logo=googlebard)
![Axe-Core](https://img.shields.io/badge/Axe--Core-v4.11-orange?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel)](https://a11y-audit-ai.vercel.app/)

> **🚀 [Try the Live Demo Here](https://a11y-audit-ai.vercel.app/)**

---

## 📖 Overview

**AI Accessibility Auditor** is a powerful, developer-focused tool that streamlines the process of creating accessible web applications. By combining the industry-standard **axe-core** engine with **Google's Gemini AI**, this application not only identifies WCAG compliance violations but intelligently **generates context-aware fixes** for you.

Whether you are auditing a legacy codebase or building new components, this tool ensures your markup meets **WCAG A, AA, and AAA** standards.

## ✨ Key Features

-   **🔍 Hybrid Accessibility Analysis**: Combines **axe-core** (standard rules) with **Gemini AI** (semantic understanding) to detect complex issues like foreign languages without lang tags, ambiguous link text, or confusing form structures.
-   **🤖 Serverless AI Backend**: Securely processes code using Google's Gemini models (Flash 2.0/Pro) via Vercel Edge Functions, keeping your API keys safe.
-   **🪄 Smart Auto-Fix (Intelligent)**:
    -   **AI Mode**: Uses Generative AI to rewrite code, fixing specific issues like `tabindex`, `aria-` misuse, or missing `autocomplete` attributes.
    -   **Legacy Fallback**: Instant, offline-capable fixes for simple patterns if AI is unreachable.
    -   **Semantic Upgrades**: Converts `<div role="form">` to `<form>`, `<a role="button">` to `<button>`, and ensures proper fieldset/legend grouping.
    -   **Form Mastery**: Enforces WCAG 1.3.5 compliance by checking and fixing missing `autocomplete` attributes on critical fields (email, tel, etc.).
    -   **Multimedia Support (WCAG 1.2)**:
        -   **Video**: Detects missing `<track>` (captions) and injects placeholders.
        -   **Audio**: Identifies missing transcripts and generates `<details>` expandable transcript placeholders.
        -   **Autoplay**: Automatically removes accessible-hostile `autoplay` attributes.
    -   **SPA / Interaction**:
        -   **Mouse-Only Events**: Detects `<div (click)>` or `onclick` without keyboard support.
        -   **Auto-Conversion**: Automatically transforms non-semantic interactive elements into native `<button>` tags, preserving event handlers.
    -   **Color Consistency**:
        -   **Hardcoded Colors**: Warns against using fixed HEX/RGB values in styles, promoting CSS Variables for Dark Mode/High Contrast support.
    -   **Accessible Typography**:
        -   **Absoute Units**: Flags `px` usage for font sizes, suggesting scalable `rem`/`em` units.
        -   **Justified Text**: Detects and warns about `text-align: justify` which hurts readability for dyslexic users.
    -   **W3C Cleanup & Structure**:
        -   **Redundant Roles**: Automatically removes unnecessary ARIA roles (e.g., `<button role="button">` becomes `<button>`).
        -   **Smart Des-Nesting**: Fixes invalid HTML structures like nested buttons by automatically converting the outer container to a `<div>`.
-   **⚙️ Custom Rule Engine**: Includes specialized checks (e.g., `prefer-native-button`, `minimize-tabindex`) that go beyond standard validators.
-   **🎨 Modern Code Editor**:
    -   Syntax highlighting for HTML/Angular.
    -   "Clear Editor" functionality for quick testing.
    -   Real-time feedback interface.
  ### ✨ Hybrid AI Engine
We combine the best of both worlds to ensure reliability and speed:
1.  **Code-First Rules (Regex Engine)**: Instant, offline fixes for 80% of common issues (links, alts, labels, mouse events). Zero latency.
2.  **Cloud AI (Gemini Pro)**: Deep semantic analysis for complex issues that require understanding context. With smart **Debounce** protection to save API quota.

### 🛡️ Resilient Auto-Fix
The Auto-Fix system is fail-safe:
- Tries to use **Gemini AI** for a context-aware fix.
- If AI fails (offline/quota), it falls back to the **Regex Engine**.
- Your code *always* gets fixed, no matter what.

## 🛠️ Tech Stack

- **Frontend**: Angular 18 (Standalone Components, Signals, RxJS)
- **Styling**: TailwindCSS
- **Core Analysis**: `Back-end API` + `Custom Regex Engine`
- **Linting**: Axe-core (Web Accessibility Standard) (TypeScript)
-   **AI Model**: [Google Gemini 2.0 Flash / Pro](https://deepmind.google/technologies/gemini/) (via REST API)
-   **Core Engine**: [axe-core](https://www.deque.com/axe/)
-   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
-   **Editor**: [PrismJS](https://prismjs.com/)

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   npm (v10+)
-   [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/LafuenteColoradoJose/a11y-audit-ai.git
    cd a11y-audit-ai
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure API Key (Securely)**
    *   Get a free API Key from [Google AI Studio](https://aistudio.google.com/).
    *   Create a file named `.env.local` in the root directory.
    *   Add your key:
        ```bash
        GEMINI_API_KEY=AIzaSy...YourKeyHere...
        ```
    *   *Note: This file is git-ignored to keep your secrets safe.*

4.  **Start the Development Server**
    Use Vercel CLI to run both the Angular frontend and the Serverless API:
    ```bash
    vercel dev
    ```

5.  **Open the Application**
    Navigate to `http://localhost:3000/` (default Vercel port) in your browser.


## 🏃‍♂️ Running with Local AI (Integrated)

This project includes a custom Python-based AI agent (`python-agent/`) that runs locally to fix accessibility issues without cloud costs.

### 1. Install Python Dependencies
One time setup:
```bash
cd python-agent
pip install -r requirements.txt
```

### 2. Prepare the AI Model
Since the AI model files are large, they are not stored in the repository. You must generate them locally (only once):
```bash
# Still inside python-agent/ directory
python train_generative.py
cd ..
```
*This will train the model using `mi_dataset_wcag_gen.csv` and save it to `mi_modelo_wcag_generativo/`.*

### 3. Start Full Stack
Run the Angular Frontend + Python Backend simultaneously:
```bash
npm run start:full
```
*Frontend runs on `http://localhost:4200`*
*AI Server runs on `http://localhost:8000`*

### 4. 🧠 Extending the AI Model (Optional)
You can teach the AI new tricks by editing the dataset!
1.  Open `python-agent/mi_dataset_wcag_gen.csv`.
2.  Add a new line with your custom example:
    ```csv
    "<bad-code>","<good-code>"
    ```
3.  Re-run the training script:
    ```bash
    cd python-agent
    python train_generative.py
    ```
4.  Restart the full stack. The AI will now understand your new rule!

## 💡 Usage Guide

1.  **Navigate to the Auditor**: Click on the "Auditor" tab in the navigation bar.
2.  **Input Code**: Paste your HTML or Angular template code into the editor on the left.
    *   *Tip: Hover over the top-right of the editor to see the "Limpiar" (Clear) button.*
3.  **Select Level**: Choose your target WCAG compliance level (Default is **Level AA**).
4.  **Analyze**: Click the **Analyze Code** button.
5.  **Review & Fix**:
    *   Issues will appear in the right-hand panel.
    *   **Critical** issues are marked in Red, **Warnings** in Yellow.
    *   If an issue has a **🪄 Auto-Fix** button, click it to automatically patch your code in the editor!

### Example Fixes

| Issue | Original Code | Auto-Fixed Code |
| :--- | :--- | :--- |
| **Mouse-Only Interaction** | `<div (click)="save()">Save</div>` | `<button type="button" (click)="save()">Save</button>` |
| **Absolute Font Size** | `font-size: 16px;` | `font-size: 1rem;` (Suggestion) |
| **Missing Autocomplete** | `<input type="email">` | `<input autocomplete="email" type="email">` |
| **Video Captions** | `<video src="..."></video>` | `<video...><track kind="captions"...></video>` |
| **Autoplay Violation** | `<video autoplay ...>` | `<video ...>` (Autoplay removed) |
| **Audio Transcript** | `<audio src="..."></audio>` | `<audio...></audio><details><summary>Transcript</summary>...</details>` |
| **Non-Semantic Button** | `<a role="button">Submit</a>` | `<button type="button">Submit</button>` |
| **Positive Tabindex** | `<div tabindex="3">...</div>` | `<div tabindex="0">...</div>` |
| **Hidden Focus** | `style="outline: none"` | `style="outline: auto 5px..."` |
| **Missing Alt Text** | `<img src="logo.png">` | `<img alt="Description needed" src="logo.png">` |
| **ARIA Hidden Focus** | `<div aria-hidden="true"><button>ok</button></div>` | `<div><button>ok</button></div>` |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
