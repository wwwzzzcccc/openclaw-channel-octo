# PPT comment HTTP contract

The shared Docs lifecycle routes and PPT content routes intentionally use different HTTP bodies. Do not infer a response envelope from the service origin.

| Operation | HTTP success | Payload |
| --- | --- | --- |
| `GET /v1/bot/docs/{docId}/ppt` | 200 | `{data:{docId,deck,baseRevision,contentHash}}` |
| `PATCH /v1/bot/docs/{docId}/ppt` | 200 | `{data:{revision,changed,contentHash}}` |
| `GET /v1/bot/docs/{docId}/comments/{commentId}` | 200 | `{comment,root}` |
| `GET /v1/bot/docs/{docId}/comments/{commentId}/replies` | 200 | `{items,nextCursor}`; `null` terminates pagination |
| `POST /v1/bot/docs/{docId}/comments` for PPT | 201 | `{id}` for initial creation **and identical receipt replay** |

PPT comments use the existing PPT storage adapter behind the common route. That adapter validates positive safe-integer IDs in `src/ppt/comments.ts::pptCommentId`, and stores the exact 201 receipt through `pptIdempotencyRepo.completeTx`. Legacy ordinary-document comments use a different storage ID contract, including lossless snowflake handling. The plugin must not broaden PPT IDs beyond the authority accepted by its backend adapter.

Verified against companion Docs backend `fe6b103727d942fc92554f8edeaed177303cb5be` (MR !130) in the local assembled deployment on 2026-09-10: public create and exact replay, revision edit/read-back, root/reply creation and authoritative reads, versions and restore, and HTML export. An installed plugin also handled a real anchored text edit and delivered its final answer in the original thread; cold reload confirmed the edit and preservation of unrelated deck fields. This is local integration evidence, not a test-cluster rollout.

The lenient generic `postDocComment` transport is retained for legacy responses. PPT uses the verified receipt contract here; accepting arbitrary 200/enveloped responses as confirmed delivery would conceal a gateway/backend mismatch.
