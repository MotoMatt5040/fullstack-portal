// server/services/ProjectPublishingServices.js

const { sequelize, tblUserProjects, tblAuthentication, tblBlueBookProjMaster } = require('../models');
const { Op } = require('sequelize');

const getPublishedProjects = async () => {
  const [projects, metadata] = await sequelize.query(`
    SELECT
      a.uuid,
      a.email,
      uproj.projectid,
      c.clientid,
      c.clientname
    FROM
      dbo.tblClients AS c
    INNER JOIN dbo.tblUserProfiles AS up ON c.ClientID = up.ClientID
    INNER JOIN dbo.tblAuthentication AS a ON a.Uuid = up.UUID
    INNER JOIN dbo.tblUserProjects AS uproj ON uproj.UUID = a.Uuid
    ORDER BY
      uproj.projectid DESC;
  `);

  return projects;
};

const publishProject = async (emails, projectId) => {
  // 1. Publish for selected users
  for (const email of emails) {
    const user = await tblAuthentication.findOne({ where: { Email: email } });
    if (user) {
      await tblUserProjects.findOrCreate({
        where: { UUID: user.Uuid, projectId: projectId },
        defaults: {
          UUID: user.Uuid,
          projectId: projectId,
          dateCreated: sequelize.literal('GETDATE()'),
          dateUpdated: sequelize.literal('GETDATE()'),
        },
      });
    }
  }

  // 2. Master Checker for Client ID 100
  const project = await tblBlueBookProjMaster.findOne({ where: { ProjectID: projectId } });
  console.log('CLIENT ID:', project.ClientID)
  if (project && project.ClientID === 100) {
    const masterEmail = 'posDirector@pos.com';
    
    // Only add posDirector if they're not already in the selected emails
    if (!emails.includes(masterEmail)) {
      const masterUser = await tblAuthentication.findOne({ where: { Email: masterEmail } });
      if (masterUser) {
        // Check if posDirector is already assigned to this project
        const existingAssignment = await tblUserProjects.findOne({
          where: { 
            UUID: masterUser.Uuid, 
            projectId: projectId 
          }
        });
        
        // Only create if not already assigned
        if (!existingAssignment) {
          await tblUserProjects.create({
            UUID: masterUser.Uuid,
            projectId: projectId,
            dateCreated: sequelize.literal('GETDATE()'),
            dateUpdated: sequelize.literal('GETDATE()'),
          });
        }
      }
    }
  }
};

const unpublishProject = async (emails, projectId) => {
  // Find UUIDs for the given emails
  const users = await tblAuthentication.findAll({
    where: {
      Email: {
        [Op.in]: emails,
      },
    },
    attributes: ['Uuid'],
  });

  if (users.length > 0) {
    const userUuids = users.map(user => user.Uuid);
    // Remove records from tblUserProjects
    await tblUserProjects.destroy({
      where: {
        UUID: {
          [Op.in]: userUuids,
        },
        projectId: projectId,
      },
    });
  }
};

const getProjects = async () => {
  const [projects, metadata] = await sequelize.query(`
        SELECT projectId, projectName FROM dbo.tblCC3ProjectHeader WHERE
  FieldStart >= DATEADD(day, -30, GETDATE()) ORDER BY FieldStart DESC
    `);
  return projects;
};

const getClients = async () => {
  const [clients, metadata] = await sequelize.query(`
        SELECT clientId, clientName FROM dbo.tblClients
    `);
  return clients;
};

module.exports = {
  getPublishedProjects,
  publishProject,
  getProjects,
  getClients,
  unpublishProject
};
