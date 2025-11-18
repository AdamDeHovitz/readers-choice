# Branch Protection Setup

This document provides instructions for setting up branch protection rules for the `main` branch to ensure code quality and prevent accidental direct pushes.

## Why Branch Protection?

Branch protection helps maintain code quality by:
- Requiring pull requests for all changes
- Running automated checks (build, lint) before merging
- Preventing force pushes and deletions
- Enabling code review workflows

## Setup Instructions

### 1. Navigate to Branch Protection Settings

1. Go to your repository on GitHub: https://github.com/AdamDeHovitz/readers-choice
2. Click on **Settings** tab
3. Click on **Branches** in the left sidebar
4. Under "Branch protection rules", click **Add rule** or **Add branch protection rule**

### 2. Configure Protection Rules

#### Branch Name Pattern
Enter: `main`

#### Protect Matching Branches

Enable the following settings:

**Require a pull request before merging**
- ✅ Check this box
- ✅ **Require approvals**: Set to `0` (or `1` if you want peer review)
  - Setting to `0` allows you to merge your own PRs without approval
  - Setting to `1` requires another person to review
- ✅ **Dismiss stale pull request approvals when new commits are pushed**
- ⬜ Require review from Code Owners (optional)

**Require status checks to pass before merging**
- ✅ Check this box
- ✅ **Require branches to be up to date before merging**
- Search for and add the following status checks:
  - `build` - Ensures the Next.js build succeeds
  - `lint` - Ensures ESLint passes

**Note**: The status checks will only appear in the list after you've pushed the CI workflow and it has run at least once. If you don't see them:
1. Merge the PR that adds the GitHub Actions workflow
2. Wait for the workflow to run
3. Come back to this page and the checks will be available to select

**Require conversation resolution before merging** (optional)
- ✅ Check this box if you want to ensure all PR comments are resolved

**Require signed commits** (optional)
- ⬜ Leave unchecked unless you want to enforce GPG signing

**Require linear history** (optional)
- ✅ Check this box to prevent merge commits (enforces rebase/squash)

**Require deployments to succeed before merging** (optional)
- ⬜ Leave unchecked for now

**Lock branch** (NOT recommended)
- ⬜ Leave unchecked - this makes the branch read-only

**Do not allow bypassing the above settings** (recommended)
- ✅ Check this box to apply rules to administrators too
- OR
- ⬜ Leave unchecked if you want admins to be able to bypass in emergencies

**Restrict who can push to matching branches** (optional)
- ⬜ Leave unchecked to allow all contributors to create PRs
- OR
- ✅ Check and specify users/teams if you want to restrict

**Allow force pushes** (NOT recommended)
- ⬜ Leave unchecked to prevent force pushes
- ⬜ Also leave "Specify who can force push" unchecked

**Allow deletions** (NOT recommended)
- ⬜ Leave unchecked to prevent branch deletion

### 3. Save Changes

Click **Create** or **Save changes** at the bottom of the page.

## Recommended Configuration

For the Readers' Choice project, we recommend:

```
✅ Require a pull request before merging
  ✅ Require approvals: 0
  ✅ Dismiss stale pull request approvals when new commits are pushed

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  ✅ Status checks: build, lint

✅ Require conversation resolution before merging

✅ Require linear history

✅ Do not allow bypassing the above settings

⬜ Restrict who can push (leave open for community contributions)
⬜ Allow force pushes (disabled)
⬜ Allow deletions (disabled)
```

## Workflow After Setup

Once branch protection is enabled:

1. **For Contributors**:
   - Fork the repository
   - Create a feature branch
   - Make changes and push to your fork
   - Open a pull request to `main`
   - Wait for CI checks to pass (build + lint)
   - Address any review comments
   - Merge when approved and checks pass

2. **For Maintainers**:
   - Review pull requests
   - Wait for CI checks to pass
   - Request changes if needed
   - Merge using "Squash and merge" or "Rebase and merge"

## CI Workflow

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs automatically on:
- Every push to `main`
- Every pull request targeting `main`

It runs two jobs in parallel:
1. **Lint**: Runs `npm run lint` to check code style
2. **Build**: Runs `npm run build` to ensure the app compiles

Both must pass before a PR can be merged (when status checks are required).

## Testing Branch Protection

After setup, test by:
1. Try to push directly to `main` - should be blocked
2. Create a PR with a lint error - CI should fail
3. Fix the error - CI should pass and PR can be merged

## Troubleshooting

**Status checks don't appear in the list**
- Make sure the CI workflow has run at least once
- Check Actions tab to see if workflows are enabled
- Verify the job names in the workflow match what you're searching for

**Can't merge even though checks passed**
- Ensure "Require branches to be up to date" is unchecked if you don't want strict updates
- Check that you've resolved all conversations if that setting is enabled

**Need to bypass protection for hotfix**
- Admin can temporarily disable protection
- OR use GitHub's bypass feature (if not restricted)
- Re-enable protection immediately after

## Additional Resources

- [GitHub Docs: Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
