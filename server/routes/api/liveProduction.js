const express = require('epress')
const router = express.Router()
const LiveProductionController = require('../../controllers/liveProductionController')
const ROLES_LIST = require('../../config/rolesList')
const verifyRoles = require('../../middleware/verifyRoles')

router.route('/')
    .get(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Manager), (req, res) => {
        const { projectid, location } = req.query
        LiveProductionController.handleGetHourlyProduction(req, res, projectid, location)
    })