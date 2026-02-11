import { Modal, Form, DatePicker, Select, Input, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';

export function SetAvailabilityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (values: any) => api.availability.create({
      status: values.status,
      start_date: values.dateRange[0].format('YYYY-MM-DD'),
      end_date: values.dateRange[1]?.format('YYYY-MM-DD'),
      note: values.note,
    }),
    onSuccess: (response: any) => {
      message.success(response.data.message);
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); 
      onClose();
      form.resetFields();
    },
    onError: () => {
        message.error('Failed to update availability');
    }
  });

  return (
    <Modal
      title="Set Availability / Report Absence"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isPending}
    >
      <Form form={form} layout="vertical" onFinish={mutate}>
        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
          <Select options={[
            { label: 'Sick Leave', value: 'sick' },
            { label: 'Vacation', value: 'vacation' },
            { label: 'Parental Leave', value: 'parental' },
            { label: 'Other', value: 'other' }
          ]} />
        </Form.Item>
        <Form.Item name="dateRange" label="Duration" rules={[{ required: true }]}>
          <DatePicker.RangePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="note" label="Reason (Optional)">
          <Input.TextArea />
        </Form.Item>
      </Form>
    </Modal>
  );
}
