

export const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/; 
  if (!regex.test(dateString)) return false; 
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());  
};

export const isValidProjectId = (projectId) => {
  const regex = /^\d{5}C?$/;
  return regex.test(projectId);
}
