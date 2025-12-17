const usersService = require('../services/UsersServices');

const handleGetAllUsers = async (req, res) => {
  try {
    const users = await usersService.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error in handleGetAllUsers:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

const handleAddUserRoles = async (req, res) => {
  try {
    const { email, roles } = req.body;
    if (!email || !roles) {
      return res.status(400).json({ message: 'Please include email and roles' });
    }

    // First get the user's UUID by email
    const user = await usersService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await usersService.addUserRoles(user.uuid, roles);
    res.status(200).json({ success: `Roles added to user ${email} successfully` });
  } catch (error) {
    console.error('Error in handleAddUserRoles:', error);
    res.status(500).json({ message: 'Error adding user roles', error: error.message });
  }
};

const handleRemoveUserRoles = async (req, res) => {
  try {
    const { email, roles } = req.body;
    if (!email || !roles) {
      return res.status(400).json({ message: 'Please include email and roles' });
    }

    // First get the user's UUID by email
    const user = await usersService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await usersService.removeUserRoles(user.uuid, roles);
    res.status(200).json({ success: `Roles removed from user ${email} successfully` });
  } catch (error) {
    console.error('Error in handleRemoveUserRoles:', error);
    res.status(500).json({ message: 'Error removing user roles', error: error.message });
  }
};

module.exports = {
  handleGetAllUsers,
  handleAddUserRoles,
  handleRemoveUserRoles,
};
