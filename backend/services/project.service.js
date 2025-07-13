import mongoose from 'mongoose';
import projectModel from '../models/project.model.js';


export const createProjectService = async ({name, userId}) => {
    if(!name || !userId) {
        throw new Error('Name and User ID are required');
    }
    try {
        const project = await projectModel.create({name, users: userId});
        return project;
    } catch (error) {
        throw new Error(error.message);
    }
}

export const getAllProjectByUserId = async (userId) => {
    if(!userId) {
        throw new Error('User ID is required');
    }
    try {
        const projects = await projectModel.find({ users: userId });
        return projects;
    } catch (error) {
        throw new Error(error.message);
    }
}

export const addUsersToProject = async ({projectId, users, userId}) => {
    // Validate required parameters
    if(!projectId) {
        throw new Error('Project ID is required');
    }

    if(!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error('Invalid Project ID');
    }

    if(!users){
        throw new Error('Users are required');
    }

    // Ensure users is an array of valid ObjectIds
    if(!Array.isArray(users) || users.some(userId => !mongoose.Types.ObjectId.isValid(userId))) {
        throw new Error('invalid userId in users array');
    }

    if(!userId) {
        throw new Error('User ID is required');
    }

    if(!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid User ID');
    }

    // Check if the requesting user is part of the project
    const project = await projectModel.findOne({
        _id: projectId,
        users: userId
    });

    if(!project) {
        throw new Error('Project not found or user is not part of the project');
    }

    // Add new users to the project using $addToSet to avoid duplicates
    const updatedProject = await projectModel.findOneAndUpdate(
        { _id: projectId },
        { $addToSet: { users: { $each: users.map(id => new mongoose.Types.ObjectId(id)) } } }, 
        { new: true }
    );

    if(!updatedProject) {
        throw new Error('Failed to add users to project');
    }

    return updatedProject;
}

export const getProjectById = async (projectId) => {
    if(!projectId) {
        throw new Error('Project ID is required');
    }

    if(!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error('Invalid Project ID');
    }

    try {
        const project = await projectModel.findOne({ _id: projectId }).populate('users');
        if(!project) {
            throw new Error('Project not found');
        }
        return project;
    } catch (error) {
        throw new Error(error.message);
    }
}

export const updateFileTreeService = async ({ projectId, fileTree }) => {
    if (!projectId) {
        throw new Error("projectId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId")
    }

    if (!fileTree) {
        throw new Error("fileTree is required")
    }

    const project = await projectModel.findOneAndUpdate({
        _id: projectId
    }, {
        fileTree
    }, {
        new: true
    })

    return project;
}