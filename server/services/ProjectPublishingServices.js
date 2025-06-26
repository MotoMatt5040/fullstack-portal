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

module.exports = { getPublishedProjects, publishProject };