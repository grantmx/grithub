# How to edit an SOP

Every change goes through a **pull request**, which is a proposed change that someone reviews before it goes live. Nothing reaches the site until a maintainer approves it. Anyone with a free GitHub account can suggest a change.

## Quick fix (in your browser, nothing to install)

1. Open the SOP page and click **Edit this page** at the bottom of the page.
2. Sign in to GitHub if asked. If you do not have write access, GitHub will offer to create your own copy (a **fork**). Accept.
3. Make your edit.
4. Click **Commit changes** and then **Propose changes**. Give the change a short, clear title.
5. Click **Create pull request** and fill in the checklist.
6. A maintainer reviews it. After it is approved and merged, the site updates within a few minutes.

## Larger edits (on your computer)

Use this when you are writing a new SOP, adding images, or editing several pages.

1. Install [VS Code](https://code.visualstudio.com/) and [GitHub Desktop](https://desktop.github.com/).
2. In GitHub Desktop, clone the repository (or your fork of it) and create a new branch.
3. Open the folder in VS Code. The SOPs are in `apps/docs/content`.
4. Press `Ctrl+Shift+V` to open the preview while you write.
5. When you are done, commit in GitHub Desktop, publish the branch, and click **Create pull request**.

## Adding a new SOP

1. Copy the text from the [SOP template](/contributing/sop-template) into a new file in the right folder under `apps/docs/content/sops`. Name it like `sop-014-incident-reporting.md`.
2. Fill in every section and the document control table.
3. Add a row to the table in the [SOP Library](/sops), and add a title for the file in that folder's `_meta.js`.
4. Work through the [Before you publish](/contributing/before-you-publish) checklist.
5. Open a pull request.

## Check your change before it is merged

Each pull request gets a **preview link** from Vercel, posted as a comment. Open it to see exactly how your change will look. Automatic checks also run, and they flag formatting slips and anything that stops the site from building.

> [!NOTE]
>
> If you are a first-time contributor, a maintainer may need to approve the automatic checks before they run.

## Run the site on your own computer (optional)

From the root of the repository:

```bash
yarn install
yarn workspace docs dev
```

Then open `http://localhost:3001`. The page refreshes as you save.

## Style guide

- Use plain, direct language. Write steps as instructions: "Open the form", not "The form should be opened".
- One action per numbered step.
- Spell out abbreviations the first time you use them.
- Name a **role** instead of a person, so the SOP stays correct when people change.
