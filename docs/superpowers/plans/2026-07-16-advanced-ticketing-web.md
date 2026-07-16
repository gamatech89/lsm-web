# Advanced Ticketing — lsm-web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the ticket conversation thread in the staff UI, let staff reply with attachments, and download attachments.

**Architecture:** Extend the typed API client (`support-tickets-api.ts`) with message/attachment types, a `postMessage` multipart call, and an authenticated blob download helper. Extend the detail modal in `SupportTicketsTab.tsx` with a thread view + reply box. The ticket `show` endpoint already returns `messages` and `attachments` (implemented in the lsm-api plan) — the list endpoint does not, so the modal fetches the full ticket via `get()`.

**Tech Stack:** React 18, TypeScript 5.7, Ant Design 5, TanStack Query, Axios, Vite 6.

**Spec:** `../lsm-api/docs/superpowers/specs/2026-07-16-advanced-ticketing-design.md` (in the lsm-api repo)

## Global Constraints

- Branch: create `feature/advanced-ticketing` from `master`.
- Depends on lsm-api plan Tasks 1–6 being implemented (staff `show` includes `messages`; `POST /support-tickets/{id}/messages`; `GET /support-tickets/attachments/{id}`).
- Attachment limits mirror the server: max 5 files, 5 MB each, png/jpg/jpeg/webp/gif/pdf.
- Verification: `npm run build` must pass (includes `tsc`); there is no unit-test harness for components in this repo.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: API client — thread types + reply + attachment download

**Files:**
- Modify: `src/lib/support-tickets-api.ts`

**Interfaces:**
- Produces:
  - `interface SupportTicketAttachment { id: number; filename: string; mime: string; size: number }`
  - `interface SupportTicketMessage { id: number; author_type: 'client' | 'staff'; author_name: string; user_id: number | null; message: string; created_at: string; attachments?: SupportTicketAttachment[] }`
  - `SupportTicket` gains optional `messages?: SupportTicketMessage[]` and `attachments?: SupportTicketAttachment[]`
  - `api.supportTickets.postMessage(ticketId, message, files?)` → POST multipart to `/support-tickets/{id}/messages`
  - `api.supportTickets.downloadAttachment(attachment)` → GETs the blob with auth and triggers a browser download

- [ ] **Step 1: Add types and methods**

In `src/lib/support-tickets-api.ts`, add after the imports:

```typescript
export interface SupportTicketAttachment {
  id: number;
  filename: string;
  mime: string;
  size: number;
}

export interface SupportTicketMessage {
  id: number;
  author_type: 'client' | 'staff';
  author_name: string;
  user_id: number | null;
  message: string;
  created_at: string;
  attachments?: SupportTicketAttachment[];
}
```

In the `SupportTicket` interface, add after `todo`:

```typescript
  messages?: SupportTicketMessage[];
  attachments?: SupportTicketAttachment[];
```

Inside the object returned by `createSupportTicketsApi`, add after `getAllGlobal`:

```typescript
    /**
     * Add a staff reply (optionally with attachments) to a ticket thread
     */
    postMessage: (ticketId: number, message: string, files?: File[]) => {
      const form = new FormData();
      form.append('message', message);
      (files ?? []).slice(0, 5).forEach((f) => form.append('attachments[]', f, f.name));
      return client.post<SupportTicketMessage>(`/support-tickets/${ticketId}/messages`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },

    /**
     * Download a ticket attachment (authenticated blob → browser download)
     */
    downloadAttachment: async (attachment: SupportTicketAttachment) => {
      const response = await client.get<Blob>(`/support-tickets/attachments/${attachment.id}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/support-tickets-api.ts
git commit -m "feat: ticket thread types, staff reply and attachment download in API client

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Thread view + reply box in the ticket detail modal

**Files:**
- Modify: `src/features/projects/components/SupportTicketsTab.tsx`

**Interfaces:**
- Consumes: Task 1 (`postMessage`, `downloadAttachment`, `SupportTicketMessage`).
- Produces: detail modal fetches the full ticket (`api.supportTickets.get`) so `messages`/`attachments` are present; renders a `TicketThread` and a reply form.

- [ ] **Step 1: Imports and detail query**

In `SupportTicketsTab.tsx`:

Add to the antd import list (line ~9-25): `Input`, `Upload`, `Avatar`.
Add to the icons import (line ~26-36): `SendOutlined`, `PaperClipOutlined`, `UserOutlined`, `CustomerServiceFilled`, `DownloadOutlined`.
Extend the type-only import (line ~39):

```typescript
import type { SupportTicket, SupportTicketAttachment, SupportTicketMessage } from '@/lib/support-tickets-api';
```

Inside the component, after the tickets query (line ~67), add a detail query and reply state:

```typescript
  // Full ticket (incl. thread) for the detail modal
  const { data: detailResponse, isLoading: detailLoading } = useQuery({
    queryKey: ['support-ticket-detail', selectedTicket?.id],
    queryFn: () => api.supportTickets.get(selectedTicket!.id),
    enabled: detailModalOpen && !!selectedTicket,
  });
  const ticketDetail: SupportTicket | null =
    ((detailResponse?.data as any)?.data as SupportTicket) ?? (detailResponse?.data as SupportTicket) ?? null;

  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);

  const replyMutation = useMutation({
    mutationFn: () => api.supportTickets.postMessage(selectedTicket!.id, replyText, replyFiles),
    onSuccess: () => {
      setReplyText('');
      setReplyFiles([]);
      queryClient.invalidateQueries({ queryKey: ['support-ticket-detail', selectedTicket?.id] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets', project.id] });
      message.success('Reply sent to client');
    },
    onError: () => {
      message.error('Failed to send reply');
    },
  });
```

- [ ] **Step 2: Attachment + thread renderers**

Add above the component's `return` statement:

```typescript
  const renderAttachments = (attachments?: SupportTicketAttachment[]) =>
    attachments && attachments.length > 0 ? (
      <Space wrap style={{ marginTop: 8 }}>
        {attachments.map((a) => (
          <Button
            key={a.id}
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => api.supportTickets.downloadAttachment(a)}
          >
            {a.filename} ({Math.round(a.size / 1024)} KB)
          </Button>
        ))}
      </Space>
    ) : null;

  const renderMessage = (msg: SupportTicketMessage) => {
    const isStaff = msg.author_type === 'staff';
    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          flexDirection: isStaff ? 'row-reverse' : 'row',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Avatar
          size="small"
          icon={isStaff ? <CustomerServiceFilled /> : <UserOutlined />}
          style={{ backgroundColor: isStaff ? '#1890ff' : '#bfbfbf', flexShrink: 0 }}
        />
        <div
          style={{
            background: isStaff ? '#e6f7ff' : '#f5f5f5',
            borderRadius: 8,
            padding: '8px 12px',
            maxWidth: '80%',
          }}
        >
          <Text type="secondary" style={{ fontSize: 11 }}>
            {msg.author_name} · {dayjs(msg.created_at).format('YYYY-MM-DD HH:mm')}
          </Text>
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.message}</Paragraph>
          {renderAttachments(msg.attachments)}
        </div>
      </div>
    );
  };
```

- [ ] **Step 3: Render thread + reply box in the modal**

In the modal body, the original message block (lines ~355-366: `<Divider>Message</Divider>` and the grey `<div>`) gains the ticket-level attachments — after the message `<div>`, add:

```tsx
            {renderAttachments(ticketDetail?.attachments)}
```

Then, directly after that (before the `resolved_at` block), add the conversation + reply UI:

```tsx
            <Divider>Conversation</Divider>

            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: 16 }}>
                <Spin />
              </div>
            ) : (ticketDetail?.messages?.length ?? 0) === 0 ? (
              <Text type="secondary">No replies yet.</Text>
            ) : (
              <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
                {ticketDetail!.messages!.map(renderMessage)}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <Input.TextArea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to the client… (they will receive it by email)"
              />
              <Space style={{ marginTop: 8, width: '100%', justifyContent: 'space-between' }}>
                <Upload
                  multiple
                  maxCount={5}
                  accept=".png,.jpg,.jpeg,.webp,.gif,.pdf"
                  beforeUpload={(file) => {
                    if (file.size > 5 * 1024 * 1024) {
                      message.error(`${file.name} is larger than 5 MB`);
                      return Upload.LIST_IGNORE;
                    }
                    setReplyFiles((prev) => [...prev, file as unknown as File].slice(0, 5));
                    return false; // manual upload via postMessage
                  }}
                  onRemove={(file) => {
                    setReplyFiles((prev) => prev.filter((f) => f.name !== file.name));
                  }}
                  fileList={replyFiles.map((f, i) => ({ uid: String(i), name: f.name }))}
                >
                  <Button icon={<PaperClipOutlined />}>Attach</Button>
                </Upload>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  disabled={!replyText.trim()}
                  loading={replyMutation.isPending}
                  onClick={() => replyMutation.mutate()}
                >
                  Send Reply
                </Button>
              </Space>
            </div>
```

Also reset reply state when the modal closes — change both `onCancel` and the footer Close button handler from `() => setDetailModalOpen(false)` to:

```typescript
          () => {
            setDetailModalOpen(false);
            setReplyText('');
            setReplyFiles([]);
          }
```

(Define it once as `const closeDetail = () => { setDetailModalOpen(false); setReplyText(''); setReplyFiles([]); };` above the columns and use `closeDetail` in both places.)

- [ ] **Step 4: Build to verify**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 5: Visual check (if dev API available)**

Run `npm run dev`, open a project's Support tab, open a ticket: thread renders, reply posts, attachments download. Otherwise defer to post-deploy verification.

- [ ] **Step 6: Commit**

```bash
git add src/features/projects/components/SupportTicketsTab.tsx
git commit -m "feat: conversation thread, staff reply and attachments in ticket detail

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Note on `/support` global page

`src/features/support/pages/SupportPage.tsx` reuses the same detail pattern only if it renders its own modal — check it after Task 2; if it has its own ticket detail modal, apply the same thread+reply block there (same code as Task 2 Step 3). If it merely links into project pages, no change is needed.
