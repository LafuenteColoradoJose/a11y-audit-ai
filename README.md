# 🤖 AI Accessibility Auditor

> **An intelligent auditing tool designed to detect and automatically fix Web Accessibility (WCAG) issues in HTML and Angular applications.**

![Angular Version](https://img.shields.io/badge/Angular-v18-dd0031?style=flat-square&logo=angular)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38b2ac?style=flat-square&logo=tailwind-css)
![Python](https://img.shields.io/badge/Python-FastAPI-3776AB?style=flat-square&logo=python)
![Transformers](https://img.shields.io/badge/AI-HuggingFace-yellow?style=flat-square&logo=huggingface)
![Axe-Core](https://img.shields.io/badge/Axe--Core-v4.11-orange?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## 📖 Overview

**AI Accessibility Auditor** is a powerful, developer-focused tool that streamlines the process of creating accessible web applications. By combining the industry-standard **axe-core** engine with a custom **Local AI Agent**, this application not only identifies WCAG compliance violations but intelligently **generates context-aware fixes** for you.

Unlike other tools that rely on expensive cloud APIs, this project runs entirely **locally** using a specialized Python backend powered by fine-tuned Transformer models and robust heuristic fallback engines (BeautifulSoup).

## ✨ Key Features

-   **🔍 Hybrid Accessibility Analysis**: Combines **axe-core** (standard rules) with **AI Agents** (semantic understanding) to detect complex issues like foreign languages without lang tags, ambiguous link text, or confusing form structures.
-   **🛡️ Robust "Fix-Everything" Engine**:
    -   **Semantic Upgrades**: Automatically converts "div soup" (`<div class="header">`) into semantic HTML (`<header>`, `<nav>`, `<main>`).
    -   **Table Repairs**: Detects layout tables masquerading as data tables (headers without data) and fixes them instantly by converting orphaned `<th>` to `<td>`.
    -   **Smart Navigation**: Automatically injects "Skip to main content" links and ensures the main content area has the correct ID.
-   **� Local AI Backend**:
    -   Run your own Generative AI model locally using Python/FastAPI.
    -   No API keys required. No data leaves your machine.
    -   Includes a **Heuristic Fallback System** that guarantees valid HTML fixes even when the AI model is uncertain.
-   **🪄 Smart Auto-Fix (Intelligent)**:
    -   **Legacy Fallback**: Instant, offline-capable fixes for simple patterns if AI is unreachable.
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

## ️ Tech Stack

- **Frontend**: Angular 18 (Standalone Components, Signals, RxJS)
- **Styling**: TailwindCSS
- **Backend (Agent)**: Python 3, FastAPI, Uvicorn
- **AI/ML**: Transformers (HuggingFace), PyTorch, BeautifulSoup4
- **Core Engine**: [axe-core](https://www.deque.com/axe/)

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   npm (v10+)
-   Python 3.10+

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/LafuenteColoradoJose/a11y-audit-ai.git
    cd a11y-audit-ai
    ```

2.  **Install Frontend Dependencies**
    ```bash
    npm install
    ```

3.  **Install Python Agent Dependencies**
    ```bash
    cd python-agent
    python3 -m venv venv
    source venv/bin/activate # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    cd ..
    ```

### 🧠 Setting up the AI Model

Since the AI model files are large, they are not committed to the repo. You need to train/generate them once.

**Option A: Train Locally** (If you have a good CPU/GPU)
```bash
cd python-agent
python train_generative.py
cd ..
```

**Option B: Train on Cloud (Google Colab)**
1. Upload `python-agent/colab_training.ipynb` to Google Colab.
2. Run the training scripts.
3. Download the zipped model and extract it to `python-agent/mi_modelo_wcag_generativo/`.

### 🏃‍♂️ Running the Application

To start both the Angular Frontend and the Python AI Backend simultaneously:

```bash
npm run start:full
```

The application will be available at `http://localhost:4200/`.

## 💡 Usage Guide

1.  **Navigate to the Auditor**: Click on the "Auditor" tab.
2.  **Input Code**: Paste your HTML or Angular template.
3.  **Analyze**: Click **Analyze Code**.
4.  **Auto-Fix**: Click the **🪄 Auto-Fix** button on any issue. 
    *   The app intelligently uses your **Local AI Agent** first.
    *   If the AI fix is uncertain, the **Heuristic Engine** takes over (fixing tables, semantics, skip links).
    *   If offline, it applies a **Regex Standard Fix**.

### Example Fixes

| Issue | Original Code | Auto-Fixed Code |
| :--- | :--- | :--- |
| **Data Table Structure** | `<table><thead>...</thead></table>` (Empty) | `<table>...<tr><td>Data Cell</td></tr></table>` (Fixed Structure) |
| **Semantic HTML** | `<div class="header">...</div>` | `<header>...</header>` |
| **Missing Skip Link** | `<header>...</header>` | `<header><a href="#main-content">Skip to content</a>...</header>` |
| **Mouse-Only Interaction** | `<div (click)="save()">Save</div>` | `<button type="button" (click)="save()">Save</button>` |
| **Missing Autocomplete** | `<input type="email">` | `<input autocomplete="email" type="email">` |
| **Video Captions** | `<video src="..."></video>` | `<video...><track kind="captions"...></video>` |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
