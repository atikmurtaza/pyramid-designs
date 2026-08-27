# Candidate File Security Review SOP

**Status:** **PROVISIONAL OWNER/OPERATIONS POLICY**
**Scanner:** Microsoft Defender Antivirus — **PROVISIONAL APPROVED MANUAL SCANNER**
**Applies to:** Windows workstations used by named Pyramid Designs candidate-file security reviewers
**Production gate:** Must be rehearsed end to end with synthetic PDFs before candidate intake is enabled.

## Purpose

Reduce the risk from untrusted candidate PDFs while preserving the fail-closed file state. Manual antivirus scanning is a risk-reduction control; it does not guarantee that a file is safe and is not equivalent to enterprise sandboxing.

> **Do not open or preview quarantined file before security review.**

## Authorised roles

- The operational **SECURITY REVIEWER** must be a named, trained person.
- In the MVP application this person must hold `HIRING_MANAGER` or `ADMIN` plus `candidate_file.security_review`.
- Ordinary `HIRING_REVIEWER` access does not permit quarantine retrieval.
- If security reviewers should not have broader hiring-manager/admin rights, introduce a narrowly scoped application role through a later approved change. Do not share accounts.

## Prerequisites

Before a reviewer handles a file:

- Windows and Microsoft Defender Antivirus are supported and current.
- Real-time protection and cloud-delivered protection are enabled where company policy permits.
- Defender reports no unresolved health/tamper issue.
- Windows, the browser and PDF software are patched.
- The workstation uses full-disk encryption and a locked named user account.
- A dedicated local quarantine directory exists outside OneDrive, Google Drive, Dropbox and other sync/backup folders.
- Only the reviewer and local administrators can access that directory.
- Windows Explorer Preview pane and Details pane content preview are disabled for the directory.
- The browser is configured not to auto-open PDFs.
- The reviewer has the current SOP and knows the incident contact.

The directory is a temporary handling location, not a second candidate archive.

## Retrieval

1. Open the application security-review workflow; do not navigate directly to Drive.
2. Authenticate with the reviewer's own staff account and complete MFA/reauthentication when required.
3. Select the candidate-file record by opaque application/file reference.
4. Confirm the displayed state is validation-passed and one of `UNREVIEWED` or `REVIEW_FAILED`.
5. Request quarantine retrieval. The server must recheck active staff status, exact permission, target scope, retention/deletion state, file version and expected SHA-256.
6. Save the attachment directly to the dedicated local quarantine directory using its opaque server filename.
7. Do not click the downloaded file, open it in a PDF viewer, use browser preview, upload it to an online scanner or send it to another person.

If the server exposes a Drive URL, original candidate filename or inline PDF preview, stop: the implementation has failed the gate.

## Safe local handling

- Handle one file at a time.
- Do not rename it to a candidate name or job title.
- Do not copy it to Desktop, Downloads, email, chat, shared folders, removable media or cloud sync.
- Do not inspect PDF metadata or content before clearance.
- Do not disable Defender, exclusions, SmartScreen or other endpoint protection to complete a scan.
- Do not use an obscure third-party scanner or public malware-upload service.

## Explicit Microsoft Defender scan

Real-time protection alone is not sufficient evidence for this workflow. Perform an explicit custom scan of the exact file.

Preferred auditable command-line procedure:

1. Update protection intelligence where operationally permitted:

   ```powershell
   Update-MpSignature
   ```

2. Compute the local SHA-256 and compare it with the application value:

   ```powershell
   Get-FileHash -Algorithm SHA256 -LiteralPath 'C:\Pyramid-Recruitment-Quarantine\<opaque-file>.pdf'
   ```

   A mismatch is not clean. Stop and record `SCAN_FAILED` with safe reason `HASH_MISMATCH`.

3. Run Defender's custom file scan from the current Defender platform directory:

   ```powershell
   & "$env:ProgramData\Microsoft\Windows Defender\Platform\<current-version>\MpCmdRun.exe" -Scan -ScanType 3 -File 'C:\Pyramid-Recruitment-Quarantine\<opaque-file>.pdf'
   ```

4. Record the command completion/exit result and Defender result. Do not paste candidate paths or content into general logs.

The Windows Security UI custom scan may be used if command-line execution is unavailable, but the reviewer must still scan the exact file and record the same minimum evidence. A quick scan or an assertion that real-time protection was enabled is not a substitute.

Useful product metadata, when reliably available without collecting PII:

```powershell
Get-MpComputerStatus | Select-Object AMProductVersion,AntivirusSignatureVersion,AntivirusSignatureLastUpdated,RealTimeProtectionEnabled
```

## Outcome recording

Record only:

- candidate-file ID;
- expected and observed SHA-256;
- review method `MANUAL`;
- scanner product `Microsoft Defender Antivirus`;
- scanner result/exit classification;
- reviewer staff ID;
- started/completed timestamps;
- optional product/signature version when reliable;
- one allowed operational outcome and safe reason code.

Do not store screenshots, full Defender logs, candidate names, filenames, CV text, paths, email addresses or medical/accommodation details unless an incident responder specifically requires protected evidence.

## Allowed outcomes

### `CLEAN`

- Preconditions: hash matches, Defender explicit scan completes successfully and reports no threat, file remains the same version.
- Application mapping: immutable review outcome `CLEARED`; current security status `CLEARED`.
- Effect: ordinary authorised hiring reviewers may later request a server-mediated attachment after a fresh authorization/state check.

### `MALICIOUS_OR_SUSPICIOUS`

- Trigger: Defender detects or quarantines a threat, or the reviewer receives another concrete suspicious result.
- Application mapping: review outcome `REJECTED`; security status `REJECTED`.
- Effect: file remains unavailable. Do not restore, open or forward it. Follow incident handling below.

### `SCAN_FAILED`

- Trigger: Defender unavailable, unhealthy, outdated beyond company tolerance, scan error, hash mismatch, access error or indeterminate result.
- Application mapping: review outcome `FAILED` or `INDETERMINATE`; security status `REVIEW_FAILED`.
- Effect: file remains quarantined. Retry only after the cause is corrected or escalate.

### `FILE_CORRUPT_OR_INVALID`

- Trigger: file cannot be read as a valid PDF, violates validation evidence or becomes corrupt.
- Application mapping: validation failure when identified by validation; otherwise review outcome `FAILED` and security status `REVIEW_FAILED`.
- Effect: file remains unavailable. Candidate replacement follows an approved workflow; never repair or convert the file locally.

### `REVIEW_CANCELLED`

- Before retrieval/review starts: audit the cancellation; no file-security state changes.
- After retrieval/review starts: an incomplete attempt is not clean. Record `FAILED` and `REVIEW_FAILED`, then clean up the local copy.

## Suspicious-file handling

1. Do not open, restore from Defender quarantine, rename, forward or upload the file elsewhere.
2. Record `MALICIOUS_OR_SUSPICIOUS` using the application workflow.
3. Notify the technical owner/security incident contact using only the opaque file/application ID and safe outcome code.
4. Keep the application reviewable without the attachment only if an approved HR policy permits; otherwise keep it technically failed.
5. The technical owner reviews possible exposure, endpoint health, Drive permissions, application audit events and whether intake must pause.
6. Candidate communication, if any, uses approved HR/privacy wording and contains no scanner internals.

## Failed-review handling

- One retry is allowed after a clear remediable cause such as updated signatures or repaired Defender health.
- A repeated failure remains `REVIEW_FAILED` and escalates to the technical owner.
- Do not mark the file clean by judgement, file appearance, successful opening, MIME/signature validation or a second unapproved scanner.
- If the manual process is unavailable for a sustained period, disable candidate-file intake or accept applications without attachments only if owner/HR approves that product behaviour.

## Local deletion and cleanup

After the outcome is durably recorded:

1. Close the browser download surface without previewing the file.
2. Delete the local quarantine copy using the normal controlled workstation deletion process.
3. Verify the file no longer exists in the quarantine directory.
4. Empty local recycle/trash handling if the deletion method placed it there.
5. Do not keep local archives or copies. Full-disk encryption and the no-sync directory are required because secure erase cannot be reliably claimed on every modern SSD.
6. If deletion fails, lock the workstation, restrict access and escalate to the technical owner.

## Incidents

Treat these as security incidents:

- a quarantined PDF is opened or previewed;
- a file is saved outside the controlled directory or synced/backed up;
- a Drive/public URL is exposed;
- a hash mismatch occurs;
- Defender reports malware;
- the workstation or reviewer account may be compromised;
- an unauthorised person retrieves or accesses a quarantine file;
- application and Drive state disagree in a way that could expose a file.

Preserve only necessary PII-safe evidence, disable access/intake where appropriate, rotate affected credentials, reconcile Drive/application state and follow the named incident owner.

## Prohibited actions

- Opening or previewing a quarantined file before clearance.
- Granting hiring staff direct Drive membership or public/link sharing.
- Scanning through a public online upload service.
- Emailing, messaging or attaching the PDF.
- Recording candidate PII in scanner evidence, tickets or general logs.
- Clearing a file on extension, MIME, signature, appearance or real-time protection alone.
- Bypassing failed/indeterminate scans.
- Using personal Google accounts, personal storage or shared staff credentials.

## Residual risk and upgrade trigger

PDF-only validation, private quarantine and explicit Defender scanning reduce attack surface and risk. They do not prove absence of malicious content. Quarantined files remain untrusted until reviewed; staff must not open them. Move to approved automated managed scanning when candidate volume, reviewer availability, repeated failures, regulatory/security requirements or risk acceptance makes the manual process inadequate.

## Official references reviewed

- [Microsoft Defender Antivirus command-line arguments](https://learn.microsoft.com/en-us/defender-endpoint/command-line-arguments-microsoft-defender-antivirus)
- [Microsoft Defender Antivirus on Windows overview](https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-antivirus-windows)
