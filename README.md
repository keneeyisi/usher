# Usher

Public interactive research demonstration for IUI 2027. The site brings together the existing CivicSphere, Insura and Lumenet demonstrations without replacing their individual Usher implementations.

## Deployment target

Expected public URL: https://keneeyisi.github.io/usher/

1. Create a **public** repository named `usher` under the GitHub account `keneeyisi`.
2. Copy the contents of this folder into the repository root.
3. Open Terminal in the extracted `usher` folder and run the commands below. Replace the email with an email address verified on your GitHub account.

   ```bash
   git config user.name "Kene Eyisi"
   git config user.email "YOUR_VERIFIED_GITHUB_EMAIL"
   git init
   git branch -M main
   git add .
   git commit -m "Initial Usher deployment"
   git remote add origin https://github.com/keneeyisi/usher.git
   git push -u origin main
   ```

   These commands set the local commit author identity. Push authentication should use your own GitHub account. Do not use a plugin or shared credential for commits or pushes.
4. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the deployment source.
5. Open the **Actions** tab and wait for `Deploy Usher to GitHub Pages` to complete successfully.
6. Visit the expected public URL above.

## Local preview

The site uses a project path (`/usher/`) to match GitHub Pages. For local testing, run a static server that serves this folder at that path, or use the published URL after deployment. Opening `index.html` directly as a `file://` URL will not work correctly.

## Project structure

- `index.html`: Usher landing page, selector and same-tab embedded website viewer.
- `sites/civicsphere/`: CivicSphere website and its own Usher files, profile, index and model assets.
- `sites/insura/`: Insura website and its own Usher files, profile, index and model assets.
- `sites/lumenet/`: Lumenet website and its own Usher files, profile, index and model assets.
- `.github/workflows/pages.yml`: GitHub Pages deployment workflow.

The source ZIP archives supplied for the three websites are not modified. This folder is a separate deployment copy. Root-relative website URLs have been rebased to the relevant site folder under the GitHub Pages project path.

## Before sharing the public link

Verify all three selector options, page navigation, search, comparison pages, Usher query and clarification flows, model downloads, browser console output, and mobile layout. The GitHub Pages address is only a target until the repository is pushed and the deployment workflow succeeds.
