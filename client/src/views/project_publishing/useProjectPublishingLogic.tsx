import { useState, useMemo } from 'react';
import { 
  useGetPublishedProjectsQuery, 
  useGetProjectsQuery, 
  useGetClientsQuery,
  useLazyGetUsersByClientQuery, 
  usePublishProjectToUsersMutation,
  useUnpublishProjectFromUsersMutation 
} from './projectPublishingApiSlice';
import { useGetUsersQuery } from '../user_management/usersApiSlice';

// Types
interface PublishedProject {
  uuid: string;
  email: string;
  projectid: string;
  clientid: number;
  clientname: string;
  projectname: string;
}

interface GroupedProject {
  projectid: string;
  projectname: string;
  clientname: string;
  users: PublishedProject[];
  userCount: number;
}

const useProjectPublishingLogic = () => {
  // State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<GroupedProject | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);

  // RTK Query hooks
  const {
    data: publishedProjects = [],
    isLoading,
    isSuccess,
    isError,
    error,
    refetch,
  } = useGetPublishedProjectsQuery();

  const { data: projects = [] } = useGetProjectsQuery();
  const { data: clients = [] } = useGetClientsQuery();
  const { data: allUsers = [] } = useGetUsersQuery(); // Add this to get all users
  const [getUsersByClient, { data: usersForClient }] = useLazyGetUsersByClientQuery();
  const [publishProjectToUsers, { isLoading: isPublishing }] = usePublishProjectToUsersMutation();
  const [unpublishProjectFromUsers, { isLoading: isUnpublishing }] = useUnpublishProjectFromUsersMutation();

  // Memoized options for selects
  const projectOptions = useMemo(
    () =>
      projects.map((p) => ({
        value: p.projectId,
        label: `${p.projectId} - ${p.projectName}`,
      })),
    [projects]
  );

  const clientOptions = useMemo(
    () =>
      clients.map((c) => ({
        value: c.clientId,
        label: c.clientName,
      })),
    [clients]
  );

  // All users options (not filtered by client)
  const allUserOptions = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.map((user: any) => ({
      value: user.email,
      label: `${user.email}${user.clientname ? ` (${user.clientname})` : ''}`,
    }));
  }, [allUsers]);

  // Client-filtered user options (existing functionality)
  const userOptions = useMemo(() => {
    if (!usersForClient) return [];
    return usersForClient.map((user: any) => ({
      value: user.email,
      label: user.email,
    }));
  }, [usersForClient]);

  // Find the selected option objects
  const selectedProjectOption = useMemo(
    () =>
      projectOptions.find((option) => option.value === selectedProjectId) ||
      null,
    [projectOptions, selectedProjectId]
  );

  const selectedClientOption = useMemo(
    () =>
      clientOptions.find((option) => option.value === selectedClientId) || null,
    [clientOptions, selectedClientId]
  );

  // Group projects by projectid and clientname
  const groupedProjects = useMemo(() => {
    if (!publishedProjects || !Array.isArray(publishedProjects)) return [];

    const projectMap = new Map<string, GroupedProject>();

    publishedProjects.forEach((project: PublishedProject) => {
      const key = `${project.projectid}-${project.clientname}`;
      
      if (projectMap.has(key)) {
        const existing = projectMap.get(key)!;
        existing.users.push(project);
        existing.userCount = existing.users.length;
      } else {
        projectMap.set(key, {
          projectid: project.projectid,
          projectname: project.projectname,
          clientname: project.clientname,
          users: [project],
          userCount: 1,
        });
      }
    });

    return Array.from(projectMap.values());
  }, [publishedProjects]);

  // Memoized filtered projects based on search term
  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return groupedProjects;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return groupedProjects.filter((project: GroupedProject) =>
      project.projectid.toLowerCase().includes(lowerSearchTerm) ||
      project.projectname.toLowerCase().includes(lowerSearchTerm) ||
      project.clientname.toLowerCase().includes(lowerSearchTerm) ||
      project.users.some(user => 
        user.email.toLowerCase().includes(lowerSearchTerm)
      )
    );
  }, [groupedProjects, searchTerm]);

  // Modal handlers
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUsers([]);
    setSelectedProjectId(null);
    setSelectedClientId(null);
  };

  const handleOpenEditModal = (project: GroupedProject) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
    
    // Find the client for this project
    const client = clients.find(c => c.clientName === project.clientname);
    if (client) {
      setSelectedClientId(client.clientId);
      getUsersByClient(client.clientId);
      
      // Pre-select currently published users
      const currentUsers = project.users.map(user => ({
        value: user.email,
        label: user.email,
      }));
      setSelectedUsers(currentUsers);
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingProject(null);
    setSelectedUsers([]);
    setSelectedClientId(null);
  };

  // Select handlers
  const handleProjectChange = (option: any) => {
    const projectId = option ? option.value : null;
    setSelectedProjectId(projectId);
  };

  const handleClientChange = (option: any) => {
    const clientId = option ? option.value : null;
    setSelectedClientId(clientId);
    setSelectedUsers([]);
    if (clientId) {
      getUsersByClient(clientId);
    }
  };

  const handleUserChange = (selectedOptions: any) => {
    setSelectedUsers(selectedOptions || []);
  };

  // Project actions
  const handlePublishProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProjectId || selectedUsers.length === 0) {
      alert('Please select a project and at least one user.');
      return;
    }

    const emails = selectedUsers.map(user => user.value);

    try {
      await publishProjectToUsers({ projectId: selectedProjectId, emails }).unwrap();
      handleCloseModal();
      handleRefresh();
    } catch (error) {
      console.error('Failed to publish project:', error);
    }
  };

  const handleUnpublishProjectInline = async (project: GroupedProject) => {
    const confirmUnpublish = window.confirm(
      `Are you sure you want to unpublish project "${project.projectid}" from all users in ${project.clientname}?`
    );

    if (confirmUnpublish) {
      try {
        const allEmails = project.users.map(user => user.email);
        await unpublishProjectFromUsers({ 
          projectId: project.projectid, 
          emails: allEmails 
        }).unwrap();
        handleRefresh();
      } catch (error) {
        console.error('Failed to unpublish project:', error);
      }
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProject) return;

    const currentEmails = editingProject.users.map(user => user.email);
    const selectedEmails = selectedUsers.map(user => user.value);
    
    // Find users to add and remove
    const usersToAdd = selectedEmails.filter(email => !currentEmails.includes(email));
    const usersToRemove = currentEmails.filter(email => !selectedEmails.includes(email));

    try {
      // Add new users
      if (usersToAdd.length > 0) {
        await publishProjectToUsers({ 
          projectId: editingProject.projectid, 
          emails: usersToAdd 
        }).unwrap();
      }

      // Remove users
      if (usersToRemove.length > 0) {
        await unpublishProjectFromUsers({ 
          projectId: editingProject.projectid, 
          emails: usersToRemove 
        }).unwrap();
      }

      handleCloseEditModal();
      handleRefresh();
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  // Toggle project expansion
  const toggleProjectExpansion = (projectKey: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectKey)) {
        newSet.delete(projectKey);
      } else {
        newSet.add(projectKey);
      }
      return newSet;
    });
  };

  // Check if project is expanded
  const isProjectExpanded = (projectKey: string) => {
    return expandedProjects.has(projectKey);
  };

  // Handler to clear search
  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // Handler to refresh data
  const handleRefresh = () => {
    refetch();
  };

  // Expand all projects
  const expandAll = () => {
    const allProjectKeys = filteredProjects.map(project => 
      `${project.projectid}-${project.clientname}`
    );
    setExpandedProjects(new Set(allProjectKeys));
  };

  // Collapse all projects
  const collapseAll = () => {
    setExpandedProjects(new Set());
  };

  return {
    // Data
    publishedProjects,
    groupedProjects,
    filteredProjects,
    projects,
    clients,
    allUsers, // Add this to return
    
    // Loading states
    isLoading,
    isSuccess,
    isError,
    error,
    isPublishing,
    isUnpublishing,
    
    // Search functionality
    searchTerm,
    setSearchTerm,
    handleClearSearch,
    
    // Expansion functionality
    expandedProjects,
    toggleProjectExpansion,
    isProjectExpanded,
    expandAll,
    collapseAll,
    
    // Modal state
    isModalOpen,
    isEditModalOpen,
    editingProject,
    
    // Select options and state
    projectOptions,
    clientOptions,
    userOptions,
    allUserOptions, // Add this to return
    selectedProjectOption,
    selectedClientOption,
    selectedUsers,
    usersForClient,
    
    // Handlers
    handleRefresh,
    handleOpenModal,
    handleCloseModal,
    handleOpenEditModal,
    handleCloseEditModal,
    handleProjectChange,
    handleClientChange,
    handleUserChange,
    handlePublishProject,
    handleUnpublishProjectInline,
    handleUpdateProject,
  };
};

export default useProjectPublishingLogic;