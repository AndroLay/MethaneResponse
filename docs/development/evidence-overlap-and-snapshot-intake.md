# Related evidence review and opt-in snapshot intake

## Compare saved investigations

In the authenticated shared workspace, save the investigation, then open
**Connected investigation → Check related claims & reused evidence**. The check
compares at most 500 investigations visible to the current reviewer in the same
snapshot and synthetic/real boundary. It identifies overlapping periods for the
same source and claim, declared document digests, reference pointers, and
assessment bundles. It never merges facilities or concludes duplicate mitigation.

Review a candidate as **Needs investigation**, **Legitimate reuse of evidence**,
or **Distinct claims or actions**, and explain why. **Add interpretation to draft**
updates Working notes; **Save shared work** records the reviewer, timestamp and
revision through the existing append-only history. Unsaved changes, revoked
authority, stale revisions, public preview and unavailable storage are rejected.
Candidate pages contain ten rows. No document body or private note is returned
by the comparison endpoint; recorded reference pointers are hashed.

`GET /api/case-work/:id/evidence-overlap` requires the exact context,
`expectedRevision`, signed `private_read` and current claim authority. It is
`no-store`, bounded to two concurrent exports/comparisons and 20 requests/minute
per process/actor/client. These are local limits, not a distributed quota.

The report is a versioned canonical SHA-256 record. Verify a retained report:

```sh
bun run verify:evidence-overlap report.json --expected-digest 0xTRUSTED_SHA256
```

The expected digest must come from a separately trusted record. Replay verifies
the supplied summaries, not all evidence in the world, publisher identity,
reviewer independence or physical mitigation. Document digests may have been
declared by a submitter; valid re-use is expected in many investigations.

## Download, normalize and stage a later publisher release

The downloader is explicit, rejects redirects away from the exact official URL,
and allows new output only in isolated `delivery-output/` or `/tmp` stages.
Active source/data/evidence trees are protected after resolving symlinks. It is
fixed to the official UNEP MARS CSV archive, bounded
to 32 MB, and requires stable publisher ETag/size/MD5/Last-Modified before and
after streaming. It records archive SHA-256, retrieval time and provenance. It
refuses existing output and does not contact a service without the approval flag.

```sh
python3 scripts/fetch_mars_candidate.py --output delivery-output/NEW-DOWNLOAD --approve-download
python3 services/data-pipeline/ingest_mars.py --input delivery-output/NEW-DOWNLOAD/unep-mars-csv.zip --retrieved-at UTC_RETRIEVAL_FROM_MANIFEST --output delivery-output/NEW-NORMALIZED.json --manifest delivery-output/NEW-INGEST-MANIFEST.json
python3 services/data-pipeline/build_web_snapshot.py --input delivery-output/NEW-NORMALIZED.json --output delivery-output/NEW-SNAPSHOT.json.gz --manifest-output delivery-output/NEW-WEB-MANIFEST.json --progressive-output-dir delivery-output/NEW-PROGRESSIVE
bun run stage:snapshot --before OLD-SNAPSHOT.json.gz --candidate NEW-SNAPSHOT.json.gz --expected-before TRUSTED_OLD_SHA256 --expected-candidate TRUSTED_NEW_SHA256 --output NEW-STAGE-DIRECTORY --approve-staging
```

Use actual manifest values; the command above contains placeholders. New output
parents must exist. Staging copies both inputs, produces the full deterministic
record diff and a manifest, and gives verifier arguments as JSON. Existing
directories and protected active/frozen trees, including symlink traversal into
them, are refused. A failed download/stage may leave a partial directory without
a completed manifest; retain it for diagnosis and choose a new directory to retry.

**Staging does not activate a release.** Activation requires a separate reviewed
rebuild of dependent source/history/intelligence projections, preservation of the
old snapshot, and compatibility checks. Changes may be backfill or corrections,
not new leaks. Missing records do not mean zero emissions. Publisher HTTP digests
are transport checks, not a cryptographic signature by UNEP.

## Source delivery

`python3 scripts/release_package.py --output NEW-SOURCE.zip` creates a new local
allowlisted archive with runtime pins, per-file checksums and working-tree source
manifest. It excludes private state, environment secrets, dependency/build caches,
large videos and unapproved design assets. It rejects recognizable credentials
and symlinks. Pattern matching is not a substitute for review of publication
content. The archive is not a Git commit, a deployment or a submitted project.

Tests: `bun run test:verifier`, the overlap API/web tests, browser investigation
journey, and `python3 -m unittest discover -s scripts -p 'test_*.py'`.
