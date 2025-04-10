const express = require('express')
const router = express.Router()
const ROLES_LIST = require('../../config/rolesList')
const verifyRoles = require('../../middleware/verifyRoles')
const LiveProductionController = require('../../controllers/liveProductionController')

router.route('/get_live_project_data')
    .get(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Manager), (req, res) => {
        LiveProductionController.handleGetHourlyProduction(req, res)
    })

router.route('/get_all_live_projects')
    .get(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Manager), (req, res) => {
        LiveProductionController.handleGetAllLiveProjects(req, res)
    })

router.route('/get_filtered_live_projects')
    .get(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Manager), (req, res) => {
        LiveProductionController.handleGetFilteredLiveProjects(req, res)
    })

module.exports = router