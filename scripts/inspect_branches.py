import subprocess
import json

branches = [
    "origin/main",
    "origin/feat/tarka-production-upgrade",
    "origin/phase-13/independent-assurance",
    "origin/phase-14/implementation-completion",
    "origin/phase-14/whole-system-completion",
    "origin/phase-15/polish",
    "origin/phase-15.7",
    "origin/phase-16/bulk-intake-and-pages",
    "origin/ui/v6-light-professional",
    "origin/v5/main",
    "origin/v6-release",
    "origin/feat/sutram-2026-ps04-member-b",
    "origin/fix/ci-post-merge-repair",
]

def run(cmd):
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, errors="replace")
    return res.stdout.strip()

results = {}
head = run("git rev-parse HEAD")
print(f"Current HEAD: {head}")

for b in branches:
    sha = run(f"git rev-parse {b}")
    merge_base = run(f"git merge-base HEAD {b}")
    ahead_behind = run(f"git rev-list --left-right --count HEAD...{b}")
    # commits on b that are not on HEAD
    unique_commits_raw = run(f"git log --oneline {merge_base}..{b}")
    unique_commits = [line for line in unique_commits_raw.splitlines() if line] if unique_commits_raw else []
    
    # commits on HEAD that are not on b
    head_ahead_raw = run(f"git log --oneline {merge_base}..HEAD")
    head_ahead = [line for line in head_ahead_raw.splitlines() if line] if head_ahead_raw else []

    # diff stat against merge base
    diff_stat = run(f"git diff --shortstat {merge_base} {b}")

    results[b] = {
        "sha": sha,
        "merge_base": merge_base,
        "ahead_behind": ahead_behind,
        "unique_commit_count": len(unique_commits),
        "unique_commits": unique_commits[:10], # sample up to 10
        "diff_stat": diff_stat,
    }
    print(f"\n=== Branch: {b} ===")
    print(f"SHA: {sha}")
    print(f"Merge base with HEAD: {merge_base}")
    print(f"Ahead(HEAD) / Behind(HEAD) count: {ahead_behind}")
    print(f"Unique commits on {b}: {len(unique_commits)}")
    for uc in unique_commits[:5]:
        print(f"  + {uc}")
    if len(unique_commits) > 5:
        print(f"  ... and {len(unique_commits) - 5} more")
    print(f"Diff stat from merge-base: {diff_stat}")

with open("scripts/branch_audit_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print("\nAudit results saved to scripts/branch_audit_results.json")
