/**
 * Manage Credential Access Modal
 *
 * Allows PM/Admin to grant or revoke developer access to a specific credential.
 * Displays all project developers with checkboxes; saves via the access sync endpoint.
 */

import { useEffect, useState } from 'react';
import {
  Modal,
  Typography,
  Checkbox,
  Avatar,
  Space,
  Button,
  App,
  Spin,
  Empty,
  Tag,
  Alert,
} from 'antd';
import { LockOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Credential } from '@lsm/types';
import { useThemeStore } from '@/stores/theme';
import { queryKeys } from '@/lib/queryKeys';
import { useInvalidateCredentials } from '@/features/vault/hooks/useInvalidateCredentials';

const { Text, Title } = Typography;

interface ManageCredentialAccessModalProps {
  open: boolean;
  onClose: () => void;
  credential: Credential | null;
  projectId: number;
}

export function ManageCredentialAccessModal({
  open,
  onClose,
  credential,
  projectId,
}: ManageCredentialAccessModalProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const invalidateCredentials = useInvalidateCredentials();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const boxStyle = {
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
  };

  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.vault.access(credential?.id),
    queryFn: () => api.credentials.getAccess(credential!.id).then(r => r.data.data),
    enabled: open && !!credential,
  });

  useEffect(() => {
    if (data) {
      setSelectedUserIds(data.granted_user_ids ?? []);
    }
  }, [data]);

  const syncMutation = useMutation({
    mutationFn: (userIds: number[]) => api.credentials.syncAccess(credential!.id, userIds),
    onSuccess: () => {
      message.success('Access updated');
      invalidateCredentials(projectId);
      queryClient.invalidateQueries({ queryKey: queryKeys.vault.access(credential?.id) });
      onClose();
    },
    onError: () => message.error('Failed to update access'),
  });

  const developers = data?.project_developers ?? [];

  const handleToggle = (userId: number, checked: boolean) => {
    setSelectedUserIds(prev =>
      checked ? [...prev, userId] : prev.filter(id => id !== userId)
    );
  };

  const handleSelectAll = () => setSelectedUserIds(developers.map(d => d.id));
  const handleClearAll = () => setSelectedUserIds([]);

  if (!credential) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={480}
      title={null}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button size="small" type="link" onClick={handleSelectAll}>Select all</Button>
            <Button size="small" type="link" onClick={handleClearAll} danger>Clear all</Button>
          </Space>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              disabled={isPending || isError}
              loading={syncMutation.isPending}
              onClick={() => syncMutation.mutate(selectedUserIds)}
            >
              Save Access
            </Button>
          </Space>
        </div>
      }
      styles={{ body: { padding: '20px 24px' } }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Space size={10}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LockOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          <div>
            <Title level={5} style={{ margin: 0 }}>Manage Access</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {credential.title} · {credential.type?.toUpperCase()}
            </Text>
          </div>
        </Space>
      </div>

      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
        Choose which developers can view and copy this credential.
        Managers always have access.
      </Text>

      {isPending ? (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin />
        </div>
      ) : isError ? (
        <Alert
          message="Failed to Load Access List"
          description="Could not load the current developer access list for this credential, so it cannot be safely edited right now. Please close this dialog and try again."
          type="error"
          showIcon
        />
      ) : developers.length === 0 ? (
        <Empty
          image={<TeamOutlined style={{ fontSize: 40, color: '#94a3b8' }} />}
          description="No developers assigned to this project"
          style={{ padding: '24px 0' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {developers.map(dev => {
            const hasAccess = selectedUserIds.includes(dev.id);
            return (
              <div
                key={dev.id}
                onClick={() => handleToggle(dev.id, !hasAccess)}
                style={{
                  ...boxStyle,
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  borderColor: hasAccess ? '#6366f1' : undefined,
                  background: hasAccess
                    ? isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)'
                    : boxStyle.background,
                  transition: 'all 0.15s ease',
                }}
              >
                <Space size={10}>
                  <Avatar
                    size={32}
                    icon={<UserOutlined />}
                    style={{
                      background: hasAccess ? '#6366f1' : '#94a3b8',
                      flexShrink: 0,
                    }}
                  >
                    {dev.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>{dev.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>{dev.email}</Text>
                  </div>
                </Space>
                <Space size={8}>
                  {hasAccess && (
                    <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>Has access</Tag>
                  )}
                  <Checkbox
                    checked={hasAccess}
                    onChange={e => {
                      e.stopPropagation();
                      handleToggle(dev.id, e.target.checked);
                    }}
                  />
                </Space>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
