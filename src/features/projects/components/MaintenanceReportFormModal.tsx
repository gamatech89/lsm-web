
import { useEffect, useState } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  DatePicker, 
  Select, 
  App, 
  InputNumber, 
  Button, 
  Space, 
  Divider, 
  Checkbox,
  List,
  Typography,
  Tooltip,
  Row,
  Col
} from 'antd';
import { 
  PlusOutlined, 
  MinusCircleOutlined, 
  WarningOutlined,
  CheckCircleOutlined,
  ContainerOutlined
} from '@ant-design/icons';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '@/lib/api';
import type { MaintenanceReport } from '@lsm/types';

const { Text } = Typography;

interface MaintenanceReportFormModalProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  report?: MaintenanceReport | null;
}

const typeOptions = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Ad-hoc', value: 'ad-hoc' },
];

export function MaintenanceReportFormModal({
  open,
  onClose,
  projectId,
  report,
}: MaintenanceReportFormModalProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEditMode = !!report;
  
  // Import Todos State
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedTodos, setSelectedTodos] = useState<string[]>([]);
  
  // Issues State (Unified list for UI)
  const [issues, setIssues] = useState<{ description: string; resolved: boolean }[]>([]);

  // Fetch completed todos for import
  const { data: completedTodos } = useQuery({
    queryKey: ['todos', 'completed', projectId],
    queryFn: () => api.todos.listByProject(projectId, { status: 'completed', include_completed: true }).then(r => r.data.data),
    enabled: showImportModal,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.maintenanceReports.create(projectId, data),
    onSuccess: () => {
      message.success('Report created successfully');
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      handleClose();
    },
    onError: () => message.error('Failed to create report'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.maintenanceReports.update(report!.id, data),
    onSuccess: () => {
      message.success('Report updated successfully');
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      handleClose();
    },
    onError: () => message.error('Failed to update report'),
  });

  const handleClose = () => {
    form.resetFields();
    setIssues([]);
    onClose();
  };

  useEffect(() => {
    if (report && open) {
      // Reconstruct unified issues list
      const issuesList = (report.issues_found || []).map(desc => ({
        description: desc,
        resolved: (report.issues_resolved || []).includes(desc)
      }));
      setIssues(issuesList);

      form.setFieldsValue({
        report_date: dayjs(report.report_date),
        type: report.type,
        summary: report.summary,
        time_spent_minutes: report.time_spent_minutes,
        notes: report.notes,
        tasks_completed: report.tasks_completed || [],
      });
    } else if (!report && open) {
      setIssues([]);
      form.resetFields();
      form.setFieldsValue({
        report_date: dayjs(),
        type: 'monthly',
        tasks_completed: [],
      });
    }
  }, [report, open, form]);

  const handleSubmit = (values: any) => {
    // Split issues back into found/resolved arrays
    const issuesFound = issues.map(i => i.description).filter(Boolean);
    const issuesResolved = issues.filter(i => i.resolved).map(i => i.description).filter(Boolean);

    const data = {
      ...values,
      report_date: values.report_date.format('YYYY-MM-DD'),
      issues_found: issuesFound,
      issues_resolved: issuesResolved,
      updates_performed: [], // Explicitly empty as requested
    };

    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleImportTodos = () => {
    const currentTasks = form.getFieldValue('tasks_completed') || [];
    const newTasks = selectedTodos.filter(t => !currentTasks.includes(t));
    form.setFieldsValue({
      tasks_completed: [...currentTasks, ...newTasks]
    });
    setShowImportModal(false);
    setSelectedTodos([]);
    message.success(`Imported ${newTasks.length} tasks`);
  };

  // Removed handleInvoiceChange as per user request (no auto-fill)

  const addIssue = () => setIssues([...issues, { description: '', resolved: false }]);
  
  const updateIssue = (index: number, field: 'description' | 'resolved', value: any) => {
    const newIssues = [...issues];
    newIssues[index] = { ...newIssues[index], [field]: value };
    setIssues(newIssues);
  };

  const removeIssue = (index: number) => {
    setIssues(issues.filter((_, i) => i !== index));
  };


  return (
    <>
      <Modal
        title={isEditMode ? 'Edit Maintenance Report' : 'Create Maintenance Report'}
        open={open}
        onCancel={handleClose}
        onOk={() => form.submit()}
        okText={isEditMode ? 'Update' : 'Create'}
        loading={createMutation.isPending || updateMutation.isPending}
        width={650}
        destroyOnHidden
        style={{ top: 20 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="report_date"
              label="Date"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%', height: 40 }} />
            </Form.Item>

            <Form.Item
              name="type"
              label="Type"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Select options={typeOptions} style={{ height: 40 }} />
            </Form.Item>
          </div>

          <Form.Item
            name="summary"
            label="Summary"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={2} placeholder="Brief summary of maintenance work performed" />
          </Form.Item>

          <Divider />

          {/* Tasks Completed Section */}
          <Form.List name="tasks_completed">
            {(fields, { add, remove }) => (
              <div style={{ marginBottom: 24 }}>
                <Space align="center" style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
                  <Text strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} /> Maintenance Tasks Completed
                  </Text>
                  <Button 
                    size="small" 
                    type="dashed" 
                    icon={<ContainerOutlined />} 
                    onClick={() => setShowImportModal(true)}
                  >
                    Import Completed Todos
                  </Button>
                </Space>
                
                {fields.map(({ key, name, ...restField }) => (
                  <Form.Item
                    required={false}
                    key={key}
                    style={{ marginBottom: 8 }}
                  >
                    <div style={{ display: 'flex', gap: 8 }}>
                       <Form.Item
                          name={name}
                          {...restField}
                          validateTrigger={['onChange', 'onBlur']}
                          rules={[{ required: true, whitespace: true, message: "Please input task." }]}
                          noStyle
                       >
                         <Input placeholder="e.g. Updated plugins, Checked backups" />
                       </Form.Item>
                       <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                    </div>
                  </Form.Item>
                ))}
                
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginTop: 4 }}>
                  Add Task
                </Button>
              </div>
            )}
          </Form.List>

          <Divider />

          {/* Issues / Out of Scope Section */}
          <div style={{ marginBottom: 24 }}>
             <Space align="center" style={{ marginBottom: 12, width: '100%' }}>
                <Text strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <WarningOutlined style={{ color: '#faad14' }} /> Issues & Out of Scope Tasks
                </Text>
             </Space>
             <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
                Track issues found during maintenance or extra out-of-scope tasks performed. Check if resolved.
             </Text>

             {issues.map((issue, index) => (
               <Row key={index} gutter={8} style={{ marginBottom: 8 }} align="middle">
                 <Col flex="auto">
                   <Input 
                     placeholder="Describe issue or extra task..." 
                     value={issue.description}
                     onChange={(e) => updateIssue(index, 'description', e.target.value)}
                   />
                 </Col>
                 <Col>
                   <Tooltip title="Mark as Resolved/Done">
                     <Checkbox 
                       checked={issue.resolved}
                       onChange={(e) => updateIssue(index, 'resolved', e.target.checked)}
                     >
                       Resolved
                     </Checkbox>
                   </Tooltip>
                 </Col>
                 <Col>
                   <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => removeIssue(index)} />
                 </Col>
               </Row>
             ))}
             
             <Button type="dashed" onClick={addIssue} block icon={<PlusOutlined />} style={{ marginTop: 4 }}>
               Add Issue / Extra Task
             </Button>
          </div>



          <Form.Item
            name="time_spent_minutes"
            label="Time Spent (minutes)"
          >
            <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g. 60" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Internal Notes"
          >
            <Input.TextArea rows={3} placeholder="Any additional notes or observations" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Todos Modal */}
      <Modal
        title="Import Completed Todos"
        open={showImportModal}
        onCancel={() => setShowImportModal(false)}
        onOk={handleImportTodos}
        okText="Import Selected"
        destroyOnClose
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Select completed todos to add as tasks in the report:
        </Text>
        
        {completedTodos && completedTodos.length > 0 ? (
          <List
            dataSource={completedTodos}
            renderItem={(item: any) => (
              <List.Item style={{ padding: '8px 0' }}>
                <Checkbox 
                  checked={selectedTodos.includes(item.title)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTodos([...selectedTodos, item.title]);
                    } else {
                      setSelectedTodos(selectedTodos.filter(t => t !== item.title));
                    }
                  }}
                >
                  {item.title}
                </Checkbox>
              </List.Item>
            )}
            style={{ maxHeight: 400, overflowY: 'auto' }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
             <ContainerOutlined style={{ fontSize: 24, marginBottom: 8 }} /><br/>
             No completed todos found for this project.
          </div>
        )}
      </Modal>
    </>
  );
}
