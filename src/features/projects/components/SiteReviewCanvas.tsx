import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Button, Input, Typography, Space, Tooltip, Badge, Divider,
  Tag, App, Spin, Avatar,
} from 'antd';
import {
  CloseOutlined, CommentOutlined, CheckCircleOutlined,
  ReloadOutlined, FilterOutlined, UserOutlined, SendOutlined,
  DeleteOutlined, CheckOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';
import type { SiteReview, SiteReviewAnnotation } from '@/lib/site-reviews-api';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Props {
  review: SiteReview;
  onClose: () => void;
  /** For guest (share) mode — pass share token instead of using auth */
  shareToken?: string;
  guestName?: string;
}

type Filter = 'all' | 'open' | 'resolved';

export function SiteReviewCanvas({ review, onClose, shareToken, guestName }: Props) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [commentMode, setCommentMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [pendingComment, setPendingComment] = useState('');
  const [iframeScrollY, setIframeScrollY] = useState(0);
  const [createTodo, setCreateTodo] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<number | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [iframeLoading, setIframeLoading] = useState(true);

  const queryKey = shareToken
    ? ['review-share-data', shareToken]
    : ['site-review', review.id];

  const { data: pins = [], refetch } = useQuery<SiteReviewAnnotation[]>({
    queryKey,
    queryFn: async () => {
      if (shareToken) {
        const r = await api.siteReviews.accessShare(shareToken);
        return r.data.data.pins;
      }
      const r = await api.siteReviews.get(review.id);
      return r.data.data.pins ?? [];
    },
  });

  const filteredPins = pins.filter(p => {
    if (filter === 'open') return !p.resolved;
    if (filter === 'resolved') return p.resolved;
    return true;
  });

  const getScrollY = () => {
    try { return iframeRef.current?.contentWindow?.scrollY ?? 0; } catch { return 0; }
  };

  // ── Add pin ──────────────────────────────────────────────────────────────
  const addPinMutation = useMutation({
    mutationFn: async ({ x, y, comment }: { x: number; y: number; comment: string }) => {
      const params = {
        x_percent: x,
        y_percent: y,
        scroll_y: getScrollY(),
        comment,
        create_todo: createTodo,
      };
      if (shareToken) {
        return api.siteReviews.addShareAnnotation(shareToken, {
          ...params,
          author_name: guestName ?? 'Client',
        });
      }
      return api.siteReviews.addAnnotation(review.id, params);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey });
      setPendingPin(null);
      setPendingComment('');
      setCreateTodo(false);
      setSelectedPinId(annotation.id);
    },
    onError: () => message.error('Failed to add pin'),
  });

  // ── Reply ────────────────────────────────────────────────────────────────
  const replyMutation = useMutation({
    mutationFn: ({ pinId, comment }: { pinId: number; comment: string }) => {
      const params = { parent_id: pinId, comment };
      if (shareToken) {
        return api.siteReviews.addShareAnnotation(shareToken, {
          ...params,
          author_name: guestName ?? 'Client',
        });
      }
      return api.siteReviews.addAnnotation(review.id, params);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey });
      setReplyInputs(prev => ({ ...prev, [vars.pinId]: '' }));
    },
    onError: () => message.error('Failed to add reply'),
  });

  // ── Resolve ──────────────────────────────────────────────────────────────
  const resolveMutation = useMutation({
    mutationFn: (annotationId: number) => api.siteReviews.resolveAnnotation(annotationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => message.error('Failed to resolve pin'),
  });

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (annotationId: number) => api.siteReviews.deleteAnnotation(annotationId),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey });
      if (selectedPinId === id) setSelectedPinId(null);
    },
    onError: () => message.error('Failed to delete pin'),
  });

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!commentMode) return;
    const rect = overlayRef.current!.getBoundingClientRect();
    const x = parseFloat((((e.clientX - rect.left) / rect.width) * 100).toFixed(2));
    const y = parseFloat((((e.clientY - rect.top) / rect.height) * 100).toFixed(2));
    setPendingPin({ x, y });
    setSelectedPinId(null);
  }, [commentMode]);

  // Close pending pin on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingPin) { setPendingPin(null); setPendingComment(''); }
        else if (commentMode) setCommentMode(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pendingPin, commentMode]);

  // Track iframe scroll via postMessage (injected by our server-side proxy)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.t === 'lsm-scroll') setIframeScrollY(e.data.y as number);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const pinNumber = (pinId: number) => {
    const allPins = pins.filter(p => !p.parent_id);
    return allPins.findIndex(p => p.id === pinId) + 1;
  };

  const openPins = pins.filter(p => !p.resolved && !p.parent_id).length;
  const selectedPin = pins.find(p => p.id === selectedPinId) ?? null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        background: isDark ? '#0f172a' : '#f1f5f9',
      }}
    >
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 52,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: isDark ? '#1e293b' : '#fff',
          borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Text strong style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
            {review.title}
          </Text>
          <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>{review.url}</Tag>
          {openPins > 0 && (
            <Badge count={openPins} color="#ef4444" style={{ fontSize: 11 }} />
          )}
        </div>

        <Space>
          <Button
            type={commentMode ? 'primary' : 'default'}
            icon={<CommentOutlined />}
            onClick={() => { setCommentMode(v => !v); setPendingPin(null); setPendingComment(''); }}
            style={commentMode ? { background: '#6366f1', borderColor: '#6366f1' } : {}}
          >
            {commentMode ? 'Comment Mode ON' : 'Comment Mode'}
          </Button>
          <Tooltip title="Reload page">
            <Button icon={<ReloadOutlined />} onClick={() => {
              if (iframeRef.current) { setIframeLoading(true); iframeRef.current.src = `${import.meta.env.VITE_API_URL || '/api/v1'}/site-review-proxy?url=${encodeURIComponent(review.url)}`; }
            }} />
          </Tooltip>
          <Button icon={<CloseOutlined />} onClick={onClose}>Close</Button>
        </Space>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Iframe + Overlay ──────────────────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {iframeLoading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: isDark ? '#0f172a' : '#f1f5f9', zIndex: 10,
            }}>
              <Spin size="large" />
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={`${import.meta.env.VITE_API_URL || '/api/v1'}/site-review-proxy?url=${encodeURIComponent(review.url)}`}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            onLoad={() => setIframeLoading(false)}
            title="Site Review"
          />

          {/* Transparent overlay — only captures events in comment mode */}
          <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            style={{
              position: 'absolute',
              inset: 0,
              cursor: commentMode ? 'crosshair' : 'default',
              pointerEvents: commentMode ? 'auto' : 'none',
            }}
          >
            {/* Render existing pins — offset by live iframe scroll */}
            {filteredPins.filter(p => !p.parent_id).map((pin, idx) => (
              <PinMarker
                key={pin.id}
                pin={pin}
                number={idx + 1}
                selected={selectedPinId === pin.id}
                isDark={isDark}
                iframeScrollY={iframeScrollY}
                overlayHeight={overlayRef.current?.offsetHeight ?? 600}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPinId(prev => prev === pin.id ? null : pin.id);
                  setPendingPin(null);
                }}
              />
            ))}

            {/* Pending (unsaved) pin */}
            {pendingPin && (
              <>
                {/* Comment input box — rendered inline to avoid z-index portal issues */}
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    left: `${Math.min(pendingPin.x, 72)}%`,
                    top: `${pendingPin.y}%`,
                    marginLeft: 20,
                    width: 280,
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: 8,
                    padding: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    zIndex: 50,
                  }}
                >
                  <TextArea
                    autoFocus
                    rows={3}
                    placeholder="Add a comment…"
                    value={pendingComment}
                    onChange={e => setPendingComment(e.target.value)}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        if (pendingComment.trim()) addPinMutation.mutate({ ...pendingPin, comment: pendingComment.trim() });
                      }
                    }}
                    style={{ background: '#0f172a', borderColor: '#475569', color: '#f1f5f9', resize: 'none' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    {!shareToken && (
                      <label style={{ fontSize: 12, cursor: 'pointer', display: 'flex', gap: 4, alignItems: 'center', color: '#94a3b8' }}>
                        <input type="checkbox" checked={createTodo} onChange={e => setCreateTodo(e.target.checked)} />
                        Create Todo
                      </label>
                    )}
                    <Space style={{ marginLeft: 'auto' }}>
                      <Button size="small" onClick={() => { setPendingPin(null); setPendingComment(''); }}>
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        loading={addPinMutation.isPending}
                        disabled={!pendingComment.trim()}
                        onClick={() => addPinMutation.mutate({ ...pendingPin, comment: pendingComment.trim() })}
                      >
                        Pin
                      </Button>
                    </Space>
                  </div>
                </div>

                <div
                  style={{
                    position: 'absolute',
                    left: `${pendingPin.x}%`,
                    top: `${pendingPin.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 28,
                    height: 28,
                    borderRadius: '50% 50% 50% 0',
                    background: '#6366f1',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 11,
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  +
                </div>
              </>
            )}
          </div>

          {/* Comment mode hint */}
          {commentMode && !pendingPin && (
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(99,102,241,0.9)',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                pointerEvents: 'none',
                backdropFilter: 'blur(4px)',
              }}
            >
              Click anywhere to add a comment · Esc to exit
            </div>
          )}
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <div
          style={{
            width: 320,
            flexShrink: 0,
            borderLeft: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            background: isDark ? '#1e293b' : '#fff',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Sidebar header */}
          <div style={{ padding: '12px 16px', borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text strong>Comments</Text>
              <Space size={4}>
                {(['all', 'open', 'resolved'] as Filter[]).map(f => (
                  <Button
                    key={f}
                    size="small"
                    type={filter === f ? 'primary' : 'text'}
                    onClick={() => setFilter(f)}
                    style={{ fontSize: 11, padding: '0 6px', height: 22 }}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Button>
                ))}
              </Space>
            </div>
          </div>

          {/* Pin list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {filteredPins.filter(p => !p.parent_id).length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {commentMode ? 'Click on the page to add a comment' : 'No comments yet'}
                </Text>
              </div>
            ) : (
              filteredPins.filter(p => !p.parent_id).map((pin, idx) => (
                <PinThread
                  key={pin.id}
                  pin={pin}
                  number={idx + 1}
                  selected={selectedPinId === pin.id}
                  isDark={isDark}
                  shareToken={shareToken}
                  replyValue={replyInputs[pin.id] ?? ''}
                  onReplyChange={val => setReplyInputs(prev => ({ ...prev, [pin.id]: val }))}
                  onReplySubmit={() => {
                    const text = (replyInputs[pin.id] ?? '').trim();
                    if (text) replyMutation.mutate({ pinId: pin.id, comment: text });
                  }}
                  onSelect={() => setSelectedPinId(prev => prev === pin.id ? null : pin.id)}
                  onResolve={() => resolveMutation.mutate(pin.id)}
                  onDelete={() => deleteMutation.mutate(pin.id)}
                  replyLoading={replyMutation.isPending}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pin marker on the overlay ─────────────────────────────────────────────────
function PinMarker({
  pin, number, selected, isDark, iframeScrollY, overlayHeight, onClick,
}: {
  pin: SiteReviewAnnotation;
  number: number;
  selected: boolean;
  isDark: boolean;
  iframeScrollY: number;
  overlayHeight: number;
  onClick: (e: React.MouseEvent) => void;
}) {
  if (pin.x_percent == null || pin.y_percent == null) return null;

  // Convert stored viewport-relative % back to document-relative pixels, then
  // re-project onto current viewport using live scroll position.
  const pinScrollY = pin.scroll_y ?? 0;
  const docY = (pin.y_percent / 100) * overlayHeight + pinScrollY;
  const renderY = ((docY - iframeScrollY) / overlayHeight) * 100;

  // Don't render if scrolled out of view
  if (renderY < -5 || renderY > 105) return null;

  const bg = pin.resolved ? '#22c55e' : selected ? '#f59e0b' : pin.author_type === 'client' ? '#3b82f6' : '#6366f1';
  return (
    <Tooltip title={pin.comment} placement="right">
      <div
        onClick={onClick}
        style={{
          position: 'absolute',
          left: `${pin.x_percent}%`,
          top: `${renderY}%`,
          transform: 'translate(-50%, -100%)',
          width: 28,
          height: 28,
          borderRadius: selected ? '50%' : '50% 50% 50% 0',
          background: bg,
          border: `2px solid ${selected ? '#fff' : 'rgba(255,255,255,0.8)'}`,
          boxShadow: selected ? '0 0 0 3px rgba(245,158,11,0.4), 0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 11,
          color: '#fff',
          fontWeight: 700,
          transition: 'all 0.15s',
          zIndex: selected ? 20 : 10,
        }}
      >
        {number}
      </div>
    </Tooltip>
  );
}

// ── Pin thread in sidebar ─────────────────────────────────────────────────────
function PinThread({
  pin, number, selected, isDark, shareToken,
  replyValue, onReplyChange, onReplySubmit, onSelect,
  onResolve, onDelete, replyLoading,
}: {
  pin: SiteReviewAnnotation;
  number: number;
  selected: boolean;
  isDark: boolean;
  shareToken?: string;
  replyValue: string;
  onReplyChange: (v: string) => void;
  onReplySubmit: () => void;
  onSelect: () => void;
  onResolve: () => void;
  onDelete: () => void;
  replyLoading: boolean;
}) {
  const bg = isDark ? (selected ? '#1e3a5f' : '#0f172a') : (selected ? '#eff6ff' : '#f8fafc');

  return (
    <div
      style={{
        margin: '0 8px 8px',
        borderRadius: 8,
        border: selected
          ? '1px solid #6366f1'
          : isDark ? '1px solid #334155' : '1px solid #e2e8f0',
        background: bg,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {/* Pin header */}
      <div
        onClick={onSelect}
        style={{ padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: pin.resolved ? '#22c55e' : pin.author_type === 'client' ? '#3b82f6' : '#6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: '#fff',
            fontWeight: 700,
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          {number}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text strong style={{ fontSize: 12 }}>{pin.author_name}</Text>
            {pin.author_type === 'client' && <Tag color="blue" style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 4px' }}>client</Tag>}
          </div>
          <Paragraph
            ellipsis={!selected ? { rows: 2 } : false}
            style={{ fontSize: 12, margin: 0, color: isDark ? '#cbd5e1' : '#374151' }}
          >
            {pin.comment}
          </Paragraph>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {new Date(pin.created_at).toLocaleDateString()}
            {pin.replies?.length > 0 && <> · {pin.replies.length} repl{pin.replies.length === 1 ? 'y' : 'ies'}</>}
          </Text>
        </div>
      </div>

      {/* Expanded content */}
      {selected && (
        <div style={{ borderTop: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0', padding: '8px 12px' }}>
          {/* Replies */}
          {pin.replies?.map(reply => (
            <div key={reply.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Avatar size={20} icon={<UserOutlined />} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <Text strong style={{ fontSize: 11 }}>{reply.author_name}</Text>
                {reply.author_type === 'client' && <Tag color="blue" style={{ fontSize: 10, marginLeft: 4, lineHeight: '16px', padding: '0 4px' }}>client</Tag>}
                <Paragraph style={{ fontSize: 12, margin: 0 }}>{reply.comment}</Paragraph>
              </div>
            </div>
          ))}

          {/* Reply input */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginTop: 4 }}>
            <TextArea
              size="small"
              rows={2}
              placeholder="Reply…"
              value={replyValue}
              onChange={e => onReplyChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onReplySubmit();
              }}
              style={{ fontSize: 12 }}
            />
            <Button
              size="small"
              type="primary"
              icon={<SendOutlined />}
              loading={replyLoading}
              disabled={!replyValue.trim()}
              onClick={onReplySubmit}
            />
          </div>

          {/* Actions */}
          {!shareToken && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
              <Button
                size="small"
                icon={pin.resolved ? <ReloadOutlined /> : <CheckOutlined />}
                onClick={onResolve}
                style={{ fontSize: 11 }}
              >
                {pin.resolved ? 'Reopen' : 'Resolve'}
              </Button>
              <Button size="small" danger icon={<DeleteOutlined />} onClick={onDelete} style={{ fontSize: 11 }}>
                Delete
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
