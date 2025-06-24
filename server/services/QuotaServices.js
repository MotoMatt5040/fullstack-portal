const axios = require('../api/axios');

const getWebQuotas = async (sid) => {
  //sid is a voxco project id
  try {
    const res = await axios.get(`/api/quotas/${sid}`);
    return res.data;
  } catch (error) {
    console.error('Error fetching web quotas:');
  }
};

const getPhoneQuotas = async (sid, token) => {
  //sid is a voxco project id
  // console.log(sid)
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
    console.error('Error fetching phone quotas:');
  }
};

module.exports = {
  getWebQuotas,
  getPhoneQuotas,
};
