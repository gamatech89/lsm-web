/**
 * Project Selector Dropdown
 * 
 * Clean dropdown for switching between projects.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Avatar, Space, Typography, Spin, Input, Divider } from 'antd';
import { SearchOutlined, GlobalOutlined, CheckOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';
import type { Project } from '@lsm/types';

const { Text } = Typography;

interface ProjectSelectorProps {
  currentProject: Project;
}

export function ProjectSelector({ currentProject }: ProjectSelectorProps) {
  const navigate = useNavigate();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch all projects for the dropdown
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => api.projects.list({ per_page: 100 }).then(r => r.data.data),
    staleTime: 30000,
    enabled: isOpen,
  });

  const projects = projectsData || [];
  const filteredProjects = projects.filter(
    (p: Project) => p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.url?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (projectId: number) => {
    navigate(`/projects/${projectId}?section=overview`);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Get domain from URL
  const getDomain = (url?: string) => {
    if (!url) return '';
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  };

  return (
    <div style={{ padding: '12px 16px' }}>
      <Select
        open={isOpen}
        onDropdownVisibleChange={setIsOpen}
        style={{ width: '100%' }}
        value={currentProject.id}
        onChange={handleSelect}
        loading={isLoading}
        showSearch={false}
        popupMatchSelectWidth={280}
        dropdownStyle={{
          padding: 0,
          borderRadius: 12,
        }}
        labelRender={() => (
          <Space align="center" style={{ gap: 10 }}>
            <Avatar
              size={28}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {currentProject.name.charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ overflow: 'hidden' }}>
              <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>
                {getDomain(currentProject.url) || currentProject.name}
              </Text>
            </div>
          </Space>
        )}
        dropdownRender={() => (
          <div style={{ padding: 8 }}>
            {/* Search */}
            <Input
              placeholder="Search websites..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ marginBottom: 8 }}
              autoFocus
            />
            
            {/* Project List */}
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin size="small" />
                </div>
              ) : filteredProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Text type="secondary">No websites found</Text>
                </div>
              ) : (
                filteredProjects.map((project: Project) => (
                  <div
                    key={project.id}
                    onClick={() => handleSelect(project.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: project.id === currentProject.id 
                        ? (isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)')
                        : 'transparent',
                      marginBottom: 2,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (project.id !== currentProject.id) {
                        e.currentTarget.style.background = isDark ? '#1e293b' : '#f8fafc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (project.id !== currentProject.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <Avatar
                      size={28}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {project.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>
                        {project.name}
                      </Text>
                      {project.url && (
                        <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                          {getDomain(project.url)}
                        </Text>
                      )}
                    </div>
                    {project.id === currentProject.id && (
                      <CheckOutlined style={{ color: '#6366f1', fontSize: 14 }} />
                    )}
                  </div>
                ))
              )}
            </div>

            <Divider style={{ margin: '8px 0' }} />
            
            {/* View All Projects */}
            <div
              onClick={() => navigate('/projects')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                color: '#6366f1',
                fontWeight: 500,
                fontSize: 13,
              }}
            >
              <GlobalOutlined />
              View All Projects
            </div>
          </div>
        )}
      />
    </div>
  );
}
