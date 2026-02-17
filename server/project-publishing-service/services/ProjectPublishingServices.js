const { sequelize, tblUserProjects, Authentication } = require('../models');
const { Op } = require('sequelize');

const getPublishedProjects = async () => {
  const [projects, metadata] = await sequelize.query(`
    SELECT
      a.uuid,
      a.email,
      uproj.projectid,
      c.clientid,
      c.clientname,
      projectname
    FROM
      dbo.tblClients AS c
    INNER JOIN FAJITA.dbo.UserProfiles AS up ON c.ClientID = up.ClientID
    INNER JOIN FAJITA.dbo.Authentication AS a ON a.Uuid = up.UUID
    INNER JOIN dbo.tblUserProjects AS uproj ON uproj.UUID = a.Uuid
    INNER JOIN dbo.tblCC3ProjectHeader AS cc3 ON cc3.ProjectID = uproj.projectId
    ORDER BY
      uproj.projectid DESC;
  `);

  return projects;
};

const publishProject = async (emails, projectId) => {
  // 1. Publish for selected users
  for (const email of emails) {
    const user = await Authentication.findOne({ where: { Email: email } });
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

  // 2. Master Checker for luke@pos.org
  const masterEmail = 'luke@pos.org';
  if (!emails.includes(masterEmail)) {
    const masterUser = await Authentication.findOne({ where: { Email: masterEmail } });
    if (masterUser) {
      // Check if luke is already assigned to this project
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
};

const unpublishProject = async (emails, projectId) => {
  // Find UUIDs for the given emails
  const users = await Authentication.findAll({
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
    FieldStart >= DATEADD(day, -30, GETDATE()) ORDER BY projectId DESC
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
