const axios = require('../api/axios');

const getWebQuotas = async (sid) => {
  try {
    const res = await axios.get(`/api/quotas/${sid}`);
    return res.data;
  } catch (error) {
    console.error('Error fetching web quotas:', error.message);
    return [];
  }
};

const getPhoneQuotas = async (sid, token) => {
  try {
    const res = await axios.get(
      `/voxco.api/projects/${sid}/stratas?status=All`,
      {
        headers: {
          Authorization: `Client ${token}`,
        },
      }
    );
    return res.data;
  } catch (error) {
    console.error('Error fetching phone quotas:', error.message);
    return [];
  }
};

module.exports = {
  getWebQuotas,
  getPhoneQuotas,
};
