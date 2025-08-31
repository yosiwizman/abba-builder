# Git Repository Cleanup Plan

Generated: 2025-01-31

## Current State Analysis

### Repository Statistics

- **Total Commits**: 579 (non-merge)
- **Verification Status**: All commits unverified (N status)
- **Branches**:
  - Local: 5 branches
  - Remote (origin): 5 branches
  - Remote (upstream): 80+ branches from original dyad-sh/dyad

### Issues Identified

1. **Unverified Commits**: All 579 commits are not GPG signed
2. **Branch Proliferation**: Too many upstream branches polluting the view
3. **Commit History**: Mixed commits from fork and original repo
4. **No Signing Setup**: GPG signing not configured

## Cleanup Strategy

### Option 1: Clean History with Squash (Recommended)

**Pros**: Clean history, single verified commit, fresh start
**Cons**: Loses granular history

### Option 2: Keep History, Add Signing Going Forward

**Pros**: Preserves all work history
**Cons**: Old commits remain unverified

### Option 3: Interactive Rebase & Sign

**Pros**: Can sign important commits
**Cons**: Time-consuming, risk of conflicts

## Recommended Approach (Option 1)

### Step 1: Setup GPG Signing

```bash
# Generate GPG key
gpg --full-generate-key

# List keys
gpg --list-secret-keys --keyid-format=long

# Add to Git
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
git config --global tag.gpgsign true

# Add to GitHub
# Copy public key: gpg --armor --export YOUR_KEY_ID
# Add to GitHub Settings > SSH and GPG keys
```

### Step 2: Create Clean Main Branch

```bash
# Backup current state
git checkout main
git branch backup-main-$(date +%Y%m%d)

# Create new clean branch from upstream
git checkout -b clean-main upstream/main

# Apply our changes as single commit
git checkout main -- .
git add -A
git commit -S -m "feat: Abba Enhanced - Complete AI Builder Implementation

This commit represents the enhanced Abba (dyad) project with:
- 95% AI success rate orchestrator system
- Claude Opus integration with 200K context
- Project library with 500+ templates
- Enhanced UI/UX improvements
- TypeScript fixes and optimizations
- MIT licensing
- Complete documentation

Co-authored-by: yosiwizman <your-email>"

# Force push to main
git push origin clean-main:main --force
```

### Step 3: Clean Up Branches

```bash
# Delete old local branches
git branch -D fix/comprehensive-restoration
git branch -D fix/remaining-typescript-errors

# Keep only active branches
# - fix/immediate-cleanup (PR #3)
# - fix/typescript-navigation (PR #4)

# Remove upstream remote (optional)
git remote remove upstream
# Or just prune remote branches
git remote prune upstream
```

### Step 4: Update Active PRs

After cleaning main:

1. Rebase PR branches on new main
2. Force push updated branches
3. PRs will automatically update

## Alternative: Incremental Cleanup

If you prefer to keep history but clean incrementally:

### Step 1: Sign Future Commits

```bash
# Setup GPG (as above)
git config --global commit.gpgsign true
```

### Step 2: Squash Feature Branches

```bash
# For each feature branch before merging
git checkout feature-branch
git rebase -i main
# Squash commits to logical units
git commit --amend -S  # Sign the squashed commit
```

### Step 3: Clean Remote Tracking

```bash
# Remove all upstream branches from local
git remote prune upstream
git branch -r | grep upstream | xargs -n 1 git branch -dr
```

### Step 4: Archive Old Work

```bash
# Create archive branch
git checkout -b archive/pre-cleanup-2025-01-31
git push origin archive/pre-cleanup-2025-01-31
```

## GitHub Settings Recommendations

1. **Branch Protection**:

   - Require signed commits on main
   - Require PR reviews
   - Require status checks

2. **Default Branch Settings**:

   - Automatically delete head branches after merge
   - Squash merge as default

3. **Security**:
   - Enable Dependabot
   - Enable secret scanning
   - Enable vulnerability alerts

## Commit Message Convention

Going forward, use conventional commits:

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

## Verification Commands

```bash
# Check signing works
echo "test" | gpg --clearsign

# Verify Git config
git config --get user.signingkey
git config --get commit.gpgsign

# Test signed commit
git commit --allow-empty -S -m "test: Verify GPG signing"
git log --show-signature -1

# Check commit verification
git log --pretty=format:"%h %G? %s" -10
```

## Timeline

1. **Immediate** (Today):

   - Setup GPG signing
   - Clean main branch
   - Update PRs

2. **Short-term** (This week):

   - Enforce signing on all new commits
   - Clean up old branches
   - Update documentation

3. **Long-term**:
   - Maintain clean commit history
   - Regular branch cleanup
   - Automated CI/CD checks

## Safety Checklist

Before proceeding:

- [ ] Backup repository locally
- [ ] Document current branch states
- [ ] Save important commit hashes
- [ ] Notify collaborators
- [ ] Test GPG signing
- [ ] Verify GitHub GPG key added
- [ ] Create archive branch

## Recovery Plan

If something goes wrong:

```bash
# Restore from backup
git checkout backup-main-20250131
git branch -f main backup-main-20250131
git push origin main --force

# Or restore from reflog
git reflog
git reset --hard HEAD@{n}
```

## Benefits After Cleanup

1. ✅ All new commits verified
2. ✅ Clean, professional history
3. ✅ Faster Git operations
4. ✅ Easier collaboration
5. ✅ Better security
6. ✅ Simplified branch structure
7. ✅ GitHub "Verified" badges
