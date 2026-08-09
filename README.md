# FormBud (fobu) 📝

> An AI-powered vision assistant for understanding and filling complex official forms, government applications, and document PDFs.

FormBud eliminates form-filling anxiety by automatically analyzing government forms, tax applications (IRS W-9, SNAP benefits, DS-82 passport renewals), and web URLs using Vision AI models.

---

## ✨ Features

- 📸 **Multi-Input Support**: Upload document images (`.png`, `.jpg`, `.heic`), PDFs, or paste online form URLs.
- 🤖 **Vision AI Powered**: Scans and parses document layouts using **NVIDIA NIM (Llama 3.2 Vision)**.
- 💡 **Plain English Explanations**: Converts complex legal jargon and acronyms into clear instructions with realistic input examples.
- 📋 **Form Intelligence**: Automatically extracts issuing authority, estimated completion time, required supporting documents, and common pitfalls.
- ⚡ **Built-in Fallback**: Fully functional out-of-the-box with smart fallback analysis mode when running without external API keys.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI & Styling**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
- **Language**: TypeScript
- **AI Integration**: NVIDIA NIM Vision API (`meta/llama-3.2-11b-vision-instruct`)

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/apexvoidd/fobu.git
cd fobu
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup (Optional)

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Add your NVIDIA NIM API key (optional — app operates in mock fallback mode if unconfigured):

```env
NVIDIA_NIM_API_KEY=your_nvidia_nim_api_key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 License

[MIT](LICENSE)
