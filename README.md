# 🤖 AI Accessibility Auditor

> **An intelligent auditing tool designed to detect and automatically fix Web Accessibility (WCAG) issues in HTML and Angular applications.**

![Angular Version](https://img.shields.io/badge/Angular-v21-dd0031?style=flat-square&logo=angular)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38b2ac?style=flat-square&logo=tailwind-css)
![Axe-Core](https://img.shields.io/badge/Axe--Core-v4.11-orange?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## 📖 Overview

**AI Accessibility Auditor** is a powerful, developer-focused tool that streamlines the process of creating accessible web applications. By leveraging the industry-standard **axe-core** engine alongside a **custom rule engine**, this application not only identifies WCAG compliance violations but effectively **fixes them for you** with a single click.

Whether you are auditing a legacy codebase or building new components, this tool ensures your markup meets **WCAG A, AA, and AAA** standards.

## ✨ Key Features

-   **🔍 Deep Accessibility Analysis**: valid your code against real-world WCAG rules using `axe-core`.
-   **🪄 Smart Auto-Fix**: Automatically resolves common issues:
    -   **Semantic Elements**: Converts `<a role="button">` to native `<button>` elements (Best Practice).
    -   **Missing Attributes**: Injects `alt` text for images and `aria-label` for buttons/inputs suitable for screen readers.
    -   **ARIA Misuse**: Detects and fixes critical errors like `aria-hidden="true"` on focusable elements.
-   **⚙️ Custom Rule Engine**: Includes specialized checks (e.g., `prefer-native-button`) that go beyond standard validators to enforce HTML semantics.
-   **🎨 Modern Code Editor**:
    -   Syntax highlighting for HTML/Angular.
    -   "Clear Editor" functionality for quick testing.
    -   Real-time feedback interface.
-   **🎚️ Adjustable Compliance Levels**: Test specifically for WCAG Level A, AA (Standard), or AAA (Strict).

## 🛠️ Tech Stack

-   **Framework**: [Angular v21](https://angular.io/) (Standalone Components, Signals, New Control Flow)
-   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
-   **Core Engine**: [axe-core](https://www.deque.com/axe/)
-   **Editor**: [PrismJS](https://prismjs.com/) for syntax highlighting

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18 or higher recommended)
-   npm (v10+ recommended)

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

3.  **Start the development server**
    ```bash
    npm start
    ```

4.  **Open the Application**
    Navigate to `http://localhost:4200/` in your browser.

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
| **Non-Semantic Button** | `<a role="button">Submit</a>` | `<button type="button">Submit</button>` |
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
