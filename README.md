# Document Chat AI: Session-Based RAG Application

Docu-Chat AI is a full-stack Retrieval-Augmented Generation (RAG) application. It allows users to securely log in, upload PDF or TXT documents, and ask questions about those documents. The AI is strictly mathematically constrained to answer only using the uploaded context, entirely preventing AI hallucinations.



## Architecture Overview
The application follows a decoupled client-server architecture:
* **Frontend (React + Vite + Tailwind CSS):** Manages user authentication, multiple document sessions, drag-and-drop file uploads, and interactive chat UI. It holds session IDs and configurable retrieval settings.
* **Backend (Node.js + Express):** Acts as the AI orchestration layer. It receives files in memory, chunks text, generates vector embeddings via the Google Gemini API, and performs mathematical cosine similarity searches to answer questions.
* **Database (In-Memory Map):** To meet strict project constraints, document embeddings are stored directly in the Node.js server's RAM and isolated perfectly using UUIDs.

---

## 🚀 Step-by-Step Setup Instructions

### Prerequisites
* Node.js installed on your machine.
* A free [Google Gemini API Key](https://aistudio.google.com/app/apikey).
* A Google OAuth Client ID (for frontend login).

### 1. Backend Setup
1. Open a terminal and navigate to the backend folder: `cd backend`
2. Install the necessary packages: `npm install`
3. Create a `.env` file in the `backend` folder and add your Gemini key:
   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here


 ### Third-Party Packages  


# Backend
1. @google/generative-ai: The official SDK for generating high-quality vector embeddings and generating fast text responses (via gemini-2.5-flash).

2. multer: Middleware used to intercept file uploads. It holds the file buffer entirely in memory (memoryStorage()) so no leftover files are ever written to the hard drive, ensuring security.

3. pdf-parse: A lightweight tool to extract raw, readable text buffers from PDF documents.

# Frontend

1. @react-oauth/google: Provides a secure, passwordless authentication flow. It keeps user credentials safely managed by Google.

2. jwt-decode: Used to decode the secure token Google sends back, allowing us to display the user's name and email in the UI safely.

3. tailwindcss: A utility-first CSS framework. Used to quickly build a highly responsive, professional SaaS layout without bloated custom CSS files.