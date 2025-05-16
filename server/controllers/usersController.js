const User = require('../services/Users');
const handleAsync = require('./asyncController');
const bcrypt = require('bcrypt');

// const getAllUsers = async (req, res) => {
//     const user = await User.find();
//     if (!user) return res.status(204).json({ "message": "No users found."} );
//     res.json(user);
// }

// const deleteUser = async (req, res) => {
//     if (!req?.body?.id) return res.status(400).json({ "message": 'User ID required' });
//     const user = await User.findOne({_id: req.body.id}).exec();
//     if (!user) return res.status(204).json({ "message": `No user matches ID ${req.body.id}`});
//     const result = await user.deleteOne({_id: req.body.id}); // exec is not needed here
//     res.json(result);
// }

// const getUser = async (req, res) => {
//     if (!req?.params?.id) return res.status(400).json({ "message": 'User ID required' });
//     const user = await User.findOne({_id: req.params.id}).exec();
//     if (!user) return res.status(204).json({ "message": `No user matches ID ${req.body.id}`});
//     res.json(user);
// }

const handleGetClients = handleAsync(async (req, res) => {
	const clients = await User.getClients();
	if (!clients) {
		return res.status(404).json({ message: 'Problem getting clients' });
	}
	res.status(200).json(clients);
});

// const handleGetPartners = handleAsync(async (req, res) => {
// 	const { clientId } = req.query;
// 	const partners = await User.getPartners(clientId);
// 	if (!partners) {
// 		return res.status(404).json({ message: 'Problem getting partners' });
// 	}
// 	res.status(200).json(partners);
// });

const handleCreateUser = handleAsync(async (req, res) => {
	const {
		email,
		password,
		external,
		roles,
		// partner,
		// partnerId,
		// director,
		clientId,
	} = req.body;
	console.log(`
        email: ${email}
        password: ${password}
        external: ${external}
        roles: ${roles}
        clientId: ${clientId}
`);
	/*
        partner: ${partner}
        partnerId: ${partnerId}
        director: ${director}
	*/

	const userId = req.user;

	let user = await User.getUser(email);
	if (user) return res.status(409).json({ message: 'User already exists' });

	req.auditData = {
		userid: userId,
		tableModified: 'tblAuthentication',
		columnModified: 'all',
		modifiedFrom: null,
		modifiedTo: 'creation',
	};

	if (!email || !password) {
		return res
			.status(400)
			.json({ message: 'Please include all required fields' });
	}

	const hashedPwd = await bcrypt.hash(password, 10);
	const created = await User.createUser(email, hashedPwd);
	console.log(created);
	user = await User.getUser(email);
	// return res.status(200).json({ message: 'User created successfully' });
	// res.status(201).json({ success: `User ${email} created successfully` });
	await User.addUserRoles(user.uuid, roles);
	if (external) await User.addUserProfile(user.uuid, clientId);
	else await User.addUserProfile(user.uuid, 188); //188 is the default client id
	// if (external) {
	// 	if (partner) {
	// 		await User.addPartner(user.uuid, clientId);
	// 	} else if (director) {
	// 		await User.addPartnerDirector(partnerId, user.uuid);
	// 	}
	// }
	res.status(201).json({ success: `User ${email} created successfully` });
});

module.exports = {
	// getAllUsers,
	// deleteUser,
	// getUser,
	handleGetClients,
	handleCreateUser,
	// handleGetPartners,
};
