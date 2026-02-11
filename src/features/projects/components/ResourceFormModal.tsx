/**
 * Resource Form Modal
 * For creating and editing project resources (links or files)
 * Supports file upload when type is "file"
 */

import { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Upload,
  App,
  Button,
} from 'antd';
import { UploadOutlined, LinkOutlined, FileOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UploadFile } from 'antd';

interface ResourceFormModalProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  resource?: {
    id: number;
    title: string;
    type: 'link' | 'file';
    url?: string;
    notes?: string;
    is_quick_action?: boolean;
  } | null;
}

const typeOptions = [
  { label: <><LinkOutlined /> Link</>, value: 'link' },
  { label: <><FileOutlined /> File</>, value: 'file' },
];

export function ResourceFormModal({
  open,
  onClose,
  projectId,
  resource,
}: ResourceFormModalProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEditMode = !!resource;
  const [resourceType, setResourceType] = useState<'link' | 'file'>('link');
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Watch for type changes
  const watchedType = Form.useWatch('type', form);

  useEffect(() => {
    if (watchedType) {
      setResourceType(watchedType);
    }
  }, [watchedType]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => api.resources.create(projectId, data),
    onSuccess: () => {
      message.success('Resource added');
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      onClose();
      form.resetFields();
      setFileList([]);
    },
    onError: () => {
      message.error('Failed to add resource');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => api.resources.update(resource!.id, data),
    onSuccess: () => {
      message.success('Resource updated');
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      onClose();
    },
    onError: () => {
      message.error('Failed to update resource');
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (resource && open) {
      form.setFieldsValue({
        title: resource.title,
        type: resource.type,
        url: resource.url,
        notes: resource.notes,
        is_quick_action: resource.is_quick_action,
      });
      setResourceType(resource.type);
    } else if (!resource && open) {
      form.resetFields();
      setResourceType('link');
      setFileList([]);
    }
  }, [resource, open, form]);

  const handleSubmit = async (values: {
    title: string;
    type: 'link' | 'file';
    url?: string;
    notes?: string;
    is_quick_action?: boolean;
  }) => {
    let data: any;

    if (values.type === 'file' && fileList.length > 0) {
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('type', values.type);
      if (values.notes) formData.append('notes', values.notes);
      if (values.is_quick_action) formData.append('is_quick_action', '1');
      else formData.append('is_quick_action', '0');
      
      // If user provided a URL for the file as fallback or alternative
      if (values.url) formData.append('url', values.url);

      if (fileList[0].originFileObj) {
        formData.append('file', fileList[0].originFileObj);
      }
      data = formData;
    } else {
      data = values;
    }

    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleFileChange = (info: { fileList: UploadFile[] }) => {
    setFileList(info.fileList);
    // When file is uploaded, you could set the URL to the file path
    // This is a placeholder - actual implementation depends on backend file upload API
  };

  return (
    <Modal
      title={isEditMode ? 'Edit Resource' : 'Add Resource'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText={isEditMode ? 'Update' : 'Add'}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={500}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ type: 'link' }}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Please enter a title' }]}
        >
          <Input placeholder="e.g. Design Files, Documentation" />
        </Form.Item>

        <Form.Item name="type" label="Type">
          <Select 
            options={typeOptions} 
            onChange={(value) => setResourceType(value)}
          />
        </Form.Item>

        {resourceType === 'link' && (
          <Form.Item
            name="url"
            label="URL"
            rules={[
              { required: resourceType === 'link', message: 'Please enter URL' },
              { type: 'url', message: 'Please enter a valid URL' },
            ]}
          >
            <Input prefix={<LinkOutlined />} placeholder="https://drive.google.com/..." />
          </Form.Item>
        )}

        {resourceType === 'file' && (
          <Form.Item
            label="File"
            extra="Upload a file or provide a direct link to the file"
          >
            <Upload
              fileList={fileList}
              onChange={handleFileChange}
              beforeUpload={() => false} // Prevent auto-upload
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
            <div style={{ marginTop: 12 }}>
              <Form.Item
                name="url"
                label="Or provide file URL"
                style={{ marginBottom: 0 }}
              >
                <Input prefix={<LinkOutlined />} placeholder="https://files.example.com/file.pdf" />
              </Form.Item>
            </div>
          </Form.Item>
        )}

        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} placeholder="Notes about this resource..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
