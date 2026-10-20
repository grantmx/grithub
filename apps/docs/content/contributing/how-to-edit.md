# How to edit a document

Every change goes through a **pull request**, which is a proposed change that someone reviews before it goes live. Nothing reaches the site until a maintainer approves it. Anyone with a free GitHub account can suggest a change.

> [!IMPORTANT]
>
> Changes to a **policy** change what GRIT Hub requires, so they need approval from the authority named in that policy. See [Review and approval](/contributing/review-and-approval).

## Quick fix (in your browser, nothing to install)

1. Open the page and click **Edit this page** at the bottom.
2. Sign in to GitHub if asked. If you do not have write access, GitHub will offer to create your own copy (a **fork**). Accept.
3. Make your edit.
4. Click **Commit changes** and then **Propose changes**. Give the change a short, clear title.
5. Click **Create pull request** and fill in the checklist.
6. A maintainer reviews it. After it is approved and merged, the site updates within a few minutes.

## Larger edits (on your computer)

Use this when you are writing a new SOP, adding images, or editing several pages.

1. Install [VS Code](https://code.visualstudio.com/) and [GitHub Desktop](https://desktop.github.com/).
2. In GitHub Desktop, clone the repository (or your fork of it) and create a new branch.
3. Open the folder in VS Code. The documents are in `apps/docs/content`.
4. Press `Ctrl+Shift+V` to open the preview while you write.
5. When you are done, commit in GitHub Desktop, publish the branch, and click **Create pull request**.

## Adding a new SOP

1. Copy the text from the [SOP template](/contributing/sop-template) into a new file in the right category folder under `apps/docs/content/sops`. Name it like `sop-trn-006-short-title.md`.
2. Fill in every section and the header table. Take amounts and approval levels from the relevant policy. Mark anything you do not know as `[TBC]`.
3. Add the page to the `_meta.js` file in the same folder, and update the [SOP Library](/sops).
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
- Name a **role** instead of a person.
- Mark every gap with `[TBC]`, so it is easy to find and cannot be missed.
