import { Modal, Form, DatePicker, Select, Input, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { useIsAdmin, useCanManageProjects } from '@/stores/auth';
import type { AvailabilityLog } from '@/lib/availability-api';
import dayjs from 'dayjs';

interface SetAvailabilityModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, the modal is pre-targeted to this user (admin setting for someone) */
  targetUserId?: number;
  targetUserName?: string;
  /** When set, the modal is in edit mode for an existing log */
  existingLog?: AvailabilityLog;
}

const statusOptions = [
  { label: '🤒 Sick Leave', value: 'sick' },
  { label: '🏖️ Vacation', value: 'vacation' },
  { label: '👶 Parental Leave', value: 'parental' },
  { label: '🏠 Remote', value: 'remote' },
  { label: '⏰ Half Day', value: 'half_day' },
  { label: '📝 Other', value: 'other' },
];

export function SetAvailabilityModal({
  open,
  onClose,
  targetUserId,
  targetUserName,
  existingLog,
}: SetAvailabilityModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const canManage = useCanManageProjects();
  const canSetForOthers = isAdmin || canManage;

  // Fetch team members for admin user selector
  const { data: teamMembers } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.team.list().then(r => r.data.data),
    enabled: open && canSetForOthers && !targetUserId && !existingLog,
  });

  const isEditMode = !!existingLog;

  const { mutate: createMutate, isPending: isCreating } = useMutation({
    mutationFn: (values: any) => {
      const payload: any = {
        status: values.status,
        start_date: values.dateRange[0].format('YYYY-MM-DD'),
        end_date: values.dateRange[1]?.format('YYYY-MM-DD'),
        note: values.note,
      };

      // Set user_id if admin is setting for someone else
      if (targetUserId) {
        payload.user_id = targetUserId;
      } else if (values.user_id) {
        payload.user_id = values.user_id;
      }

      return api.availability.create(payload);
    },
    onSuccess: (response: any) => {
      message.success(response.data.message || t('availability.statusSet'));
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      onClose();
      form.resetFields();
    },
    onError: () => {
      message.error(t('availability.error'));
    },
  });

  const { mutate: updateMutate, isPending: isUpdating } = useMutation({
    mutationFn: (values: any) =>
      api.availability.update(existingLog!.id, {
        status: values.status,
        start_date: values.dateRange[0].format('YYYY-MM-DD'),
        end_date: values.dateRange[1]?.format('YYYY-MM-DD') || null,
        note: values.note || null,
      }),
    onSuccess: () => {
      message.success(t('availability.updated'));
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
      form.resetFields();
    },
    onError: () => {
      message.error(t('availability.error'));
    },
  });

  const handleSubmit = (values: any) => {
    if (isEditMode) {
      updateMutate(values);
    } else {
      createMutate(values);
    }
  };

  // Pre-fill form when editing
  const initialValues = existingLog
    ? {
        status: existingLog.status,
        dateRange: [
          dayjs(existingLog.start_date),
          existingLog.end_date ? dayjs(existingLog.end_date) : undefined,
        ],
        note: existingLog.note,
      }
    : undefined;

  const modalTitle = isEditMode
    ? t('availability.editAbsence')
    : targetUserId && targetUserName
      ? `${t('availability.setStatusFor')} ${targetUserName}`
      : t('availability.setStatus');

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={() => {
        onClose();
        form.resetFields();
      }}
      onOk={() => form.submit()}
      confirmLoading={isCreating || isUpdating}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={initialValues}
        preserve={false}
      >
        {/* User selector — only shown for admin when no target user is pre-set */}
        {canSetForOthers && !targetUserId && !isEditMode && (
          <Form.Item name="user_id" label={t('availability.selectMember')}>
            <Select
              placeholder={t('availability.selectMemberPlaceholder')}
              options={teamMembers?.map((u: any) => ({
                label: `${u.name} (${u.role})`,
                value: u.id,
              }))}
              allowClear
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        )}

        <Form.Item name="status" label={t('availability.statusLabel')} rules={[{ required: true }]}>
          <Select options={statusOptions} />
        </Form.Item>

        <Form.Item name="dateRange" label={t('availability.duration')} rules={[{ required: true }]}>
          <DatePicker.RangePicker style={{ width: '100%' }} allowEmpty={[false, true]} />
        </Form.Item>

        <Form.Item name="note" label={t('availability.reason')}>
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
