# TryMe — Virtual Try-On Chrome Extension

A browser-based virtual try-on tool that lets users overlay garment images onto a selfie directly while shopping online.  
The extension communicates with a lightweight Node/Express backend, which forwards images to the **IDM-VTON** Hugging Face Space for AI-powered try-on generation.

<br>

![Platform](https://img.shields.io/badge/Platform-Chrome_Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)
![Language](https://img.shields.io/badge/Language-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![UI](https://img.shields.io/badge/UI-HTML%20%2F%20CSS-E34F26?style=for-the-badge&logo=html5&logoColor=white)

![Backend](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Hosted_On](https://img.shields.io/badge/Hosted_on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

![Model](https://img.shields.io/badge/AI_Model-IDM--VTON-FF6F61?style=for-the-badge&logo=huggingface&logoColor=white)
![API](https://img.shields.io/badge/API-HuggingFace_Space-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black)

<br>

---

## Inspiration

TryMe was originally inspired by my team's **NatHacks 2025** hackathon project.  
The goal was to create a lightweight, virtual try-on tool to reduce clothing waste while shopping online.

Check out the original project on Devpost:
_Hackathon project link_: **[Devpost Page Here](https://devpost.com/software/emergrade)**  

<br>

---

## Model Credit — yisol/IDM-VTON

All virtual try-on results are generated using the excellent open-source model:

### **IDM-VTON on Hugging Face**  
🔗 https://huggingface.co/spaces/yisol/IDM-VTON  

### **GitHub Repository**  
🔗 https://github.com/yisol/IDM-VTON  

This extension does **not** modify or distribute model weights.  
All inference calls go directly through the publicly available **Hugging Face Space API** using the `@gradio/client` library.

If you use or extend this project, please credit **yisol et al.** for their work.

<br>

---

## Backend (Node + Express)

TryMe uses a minimal Node/Express backend built specifically to:

- Accept garment + selfie images from the extension
- Send them to IDM-VTON using the official `@gradio/client`
- Normalize the Space output
- Return a browser-ready image to the extension

### Backend Repository  
🔗 **[TryMe Backend](https://github.com/JeremelleV/TryMe-backend)**

### Deployment Notes  
The backend is deployed on **Render (free tier)**.  
This means:

- If the service has been idle, it may take **20–40 seconds** to spin up  
- During cold starts, the extension may temporarily fall back to the mock image

Once warm, results are generally fast.

<br>

---


