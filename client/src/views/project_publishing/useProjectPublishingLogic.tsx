import { useState, useMemo } from 'react';
import { useGetPublishedProjectsQuery, useGetProjectsQuery, useGetClientsQuery } from '../../features/projectPublishingApiSlice';

// Types
interface PublishedProject {
  uuid: string;
  email: string;
  projectid: string;
  clientid: number;
  clientname: string;
}

interface GroupedProject {
  projectid: string;
  clientname: string;
  users: PublishedProject[];
  userCount: number;
}

const useProjectPublishingLogic = () => {
  // State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // RTK Query hook for fetching published projects
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
      project.clientname.toLowerCase().includes(lowerSearchTerm) ||
      project.users.some(user => 
        user.email.toLowerCase().includes(lowerSearchTerm)
      )
    );
  }, [groupedProjects, searchTerm]);

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
    
    // Loading states
    isLoading,
    isSuccess,
    isError,
    error,
    
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
    
    // Actions
    handleRefresh,
  };
};

export default useProjectPublishingLogic;