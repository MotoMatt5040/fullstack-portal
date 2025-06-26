// server/services/ProjectPublishingServices.js

const { sequelize } = require('../models');

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

const publishProject = async (email, projectId) => {
  await sequelize.query(`
    INSERT INTO dbo.tblUserProjects (UUID, projectId, dateCreated, dateUpdated)
    SELECT uuid, :projectId, GETDATE(), GETDATE()
    FROM dbo.tblAuthentication 
    WHERE email = :email
  `, {
    replacements: { email, projectId }
  });
};

const getProjects = async () => {
    const [projects, metadata] = await sequelize.query(`
        SELECT projectId, projectName FROM dbo.tblCC3ProjectHeader WHERE
  FieldStart >= DATEADD(day, -30, GETDATE()) ORDER BY FieldStart DESC
    `);
    return projects;
}

const getClients = async () => {
    const [clients, metadata] = await sequelize.query(`
        SELECT clientId, clientName FROM dbo.tblClients
    `);
    return clients;
}

module.exports = { getPublishedProjects, publishProject, getProjects, getClients };