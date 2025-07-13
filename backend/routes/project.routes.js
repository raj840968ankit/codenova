import { Router } from "express";
import { body } from "express-validator";
import * as projectController from '../controllers/project.controller.js';
import { authUser } from "../middleware/auth.middleware.js";

const router = Router();

router.post('/create', authUser, [
    body('name').isString().withMessage('Name is required'),
], projectController.createProjectController)

router.get('/all', authUser, projectController.getAllProjectsController); //! getting all projects of the logged in user

router.put('/add-user', 
    authUser,
    body('projectId').isString().withMessage('Project ID is required'),
    body('users').isArray({min: 1}).withMessage('User must be an array with at least one user').bail()
    .custom((users) => users.every(user => typeof user === 'string' && user.trim() !== '')).withMessage('Each user must be a non-empty string'),
    projectController.addUserToProjectController
); //! add user to project

router.get('/get-project/:projectId',authUser, projectController.getProjectByIdController); //! get project by id

router.put('/update-file-tree',
    authUser,
    body('projectId').isString().withMessage('Project ID is required'),
    body('fileTree').isObject().withMessage('File tree is required'),
    projectController.updateFileTree
)

export const projectRouter = router;