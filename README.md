# UPT Configurator

A React + Vite product configurator with 3D GLB assets.

## Deploying to Vercel

1. **Push your code to GitHub**  
   If the repo isn’t on GitHub yet:
   - Create a new repository on [github.com](https://github.com/new).
   - In your project folder, run:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
     git push -u origin main
     ```

2. **Sign in to Vercel**  
   Go to [vercel.com](https://vercel.com) and sign in (GitHub is the easiest).

3. **Import the project**  
   - Click **Add New…** → **Project**.
   - Select your GitHub account and choose this repository.
   - Click **Import**.

4. **Configure the build (optional)**  
   The repo’s `vercel.json` already sets:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`  
   You can leave the defaults as-is.

5. **Deploy**  
   Click **Deploy**. Vercel will install dependencies, run `npm run build`, and publish the site. When it’s done, you’ll get a URL like `https://your-project.vercel.app`.

6. **Updates**  
   Push to the `main` branch (e.g. `git push origin main`); Vercel will automatically build and deploy.

---

## React + Vite (dev)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
