# ADR 0003: Public and candidate storage separation

**Status:** Accepted

Portfolio/culture media may use Hostinger-hosted public storage/CDN. Candidate documents use a separate private Google Drive recruitment boundary, never public-media infrastructure. The PostgreSQL candidate-file record, not a Drive folder or URL, remains authoritative for technical, security, hiring and retention state.

No candidate document has public sharing, `anyoneWithLink`, a permanent URL, candidate-facing Drive link or general staff Drive membership. A future storage migration must preserve these boundaries.
