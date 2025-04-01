const getTotalHoursAndCompletesByProject = (data) => {
  return data.reduce((acc, row) => {
    const { project_id, cms, hours } = row;

    if (!acc[project_id]) {
      acc[project_id] = { totalHours: 0, totalCompletes: 0 };
    }

    acc[project_id].totalHours += hours;

    acc[project_id].totalCompletes += cms;

    return acc;
  }, {});
};

const calculateCPH = (data) => {
  Object.keys(data).forEach((project_id) => {
    const { totalHours, totalCompletes } = data[project_id];

    if (totalHours > 0) {
      data[project_id].cph = (totalCompletes / totalHours).toFixed(2);
    } else {
      data[project_id].cph = 0; 
    }
  });

  return data;
};

// Example usage:
// const data = [
//   { project_id: 1, cms: 5, hours: 5 },
//   { project_id: 2, cms: 3, hours: 3 },
//   { project_id: 1, cms: 2, hours: 2 },
//   { project_id: 3, cms: 8, hours: 8 },
//   { project_id: 2, cms: 1, hours: 1 },
//   { project_id: 1, cms: 4, hours: 4 },
// ];

// const total = getTotalHoursAndCompletesByProject(data);
// console.log(total);
