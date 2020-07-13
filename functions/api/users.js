var express = require('express')
var router = express.Router()
const admin = require('firebase-admin')
const db = admin.firestore()
const logger = require('../middleware/logger')
const joi = require('@hapi/joi')
const validate = require('../common/validator')
const formatDate = require('../common/dateFormatter')
const constants = require('../common/constants')
const functions = require('firebase-functions')
const audit = require('./audit')
const { isAdminOrSuperAdmin, isSuperAdmin } = require('../middleware/auth')
/*
This rest api is invoked during signup of users
1.Gets the user uid using email
2.Saves the user record in users collection
3.Sets the custom claims for the uid
*/
router.post('/', isAdminOrSuperAdmin, async (req, res, next) => {
    const { error } = validateInput(req.body, constants.CREATE)
    if (error) {
        const err = new Error(error.details[0].message)
        err.statusCode = 400
        next(err)
        return
    }
    const { role, branch } = req.body
    const user = await admin.auth().getUserByEmail(req.body.email).catch(error => {
        const err = new Error(error.message)
        err.statusCode = error.code === "auth/user-not-found" ? 404 : 500
        next(err)
        return
    })
    const { uid } = user
    let usersRef = db.collection(constants.USERS).doc(uid)
    const doc = await usersRef.get()
    if (doc.exists) {
        const err = new Error(`${req.body.email} already exists. Please update if needed.`)
        err.statusCode = 400
        next(err)
        return
    }
    const response = {
        ...req.body,
        createdDate: new Date(),
        lastUpdatedDate: new Date()
    }
    await usersRef.set({
        ...response
    })
    await admin.auth().setCustomUserClaims(uid, {
        role, branch
    })
    logger.info(`${req.body.email} added to users list and claims have been set`)

    // Fire and forget audit log
    const eventMessage = `User ${req.user.firstName} created new user ${req.body.firstName}`
    audit.logEvent(eventMessage, req)

    res.status(201).send({ id: uid, ...response })
})

/*
1.Returns all users in users collection.
*/
router.get('/', async (req, res) => {
    let usersRef = db.collection(constants.USERS)
    const snapshot = await usersRef.get()
    const allUsers = []
    snapshot.forEach(doc => {
        const users = formatDate(doc.data())
        allUsers.push({ id: doc.id, ...users })
    })
    const response = {
        users: allUsers,
        totalUsers: allUsers.length
    }
    res.status(200).send(response)
})

/*
1.Returns a specific user
*/
router.get('/:id', async (req, res, next) => {
    let usersRef = db.collection(constants.USERS).doc(req.params.id)
    const doc = await usersRef.get()

    if (!doc.exists) {
        const error = new Error(`${req.params.id} not found in firestore`)
        error.statusCode = 404
        next(error)
        return
    } else {
        const user = formatDate(doc.data())
        res.status(200).send({ id: doc.id, ...user })
    }
})
/*
1.Updates the user record in users collection 
2.Sets/updates the custom claims for the uid
3.Disables users account if isActive is passed as false
*/
router.put('/', isAdminOrSuperAdmin, async (req, res, next) => {

    const { error } = validateInput(req.body, constants.UPDATE)
    if (error) {
        const err = new Error(error.details[0].message)
        err.statusCode = 400
        next(err)
        return
    }
    const { role, branch, id, isActive } = req.body
    delete req.body.id
    let usersRef = db.collection(constants.USERS).doc(id)
    const doc = await usersRef.get()
    if (!doc.exists) {
        const error = new Error(`Requested ${id} is not present in firestore`)
        error.statusCode = 404
        next(error)
        return
    }
    const oldData = doc.data()
    let newData = req.body
    delete newData[constants.ID]
    delete newData[constants.CREATED_DATE]
    delete newData[constants.EMAIL]
    newData[constants.LAST_UPDATED_DATE] = new Date()
    console.log('updating user')
    await usersRef.set(newData, { merge: true })

    //update claims
    if (oldData.role !== newData.role || oldData.branch !== newData.branch) {
        await admin.auth().setCustomUserClaims(id, {
            role,
            branch
        })
        console.log('custom claims updated')
    }

    //disable users account in authentication
    console.log(isActive)
    if(isActive == false){
        await admin.auth().updateUser(id, {
            disabled: true
        })
        console.log('disabled user account')
    }else {
        await admin.auth().updateUser(id, {
            disabled: false
        })
        console.log('enabled user account')
    }
    newData[constants.CREATED_DATE] = oldData[constants.CREATED_DATE]
    
    // Fire and forget audit log
    const eventMessage = `User ${req.user.firstName} updated user ${oldData[constants.NAME]}`
    audit.logEvent(eventMessage, req, oldData, newData)

    res.sendStatus(204)
})

/*
1.Deletes the user record
*/
router.delete('/:id', isSuperAdmin, async (req, res, next) => {
    let usersRef = db.collection(constants.USERS).doc(req.params.id)
    const doc = await usersRef.get()

    if (!doc.exists) {
        const error = new Error(`${req.params.id} not found in firestore`)
        error.statusCode = 404
        next(error)
        return
    }
    await db.collection(constants.USERS).doc(req.params.id).delete()
    console.log('deleted from users collection')
    //delete user from authentication
    await admin.auth().deleteUser(req.params.id)
    console.log('deleted user account')
    // Fire and forget audit log
    const eventMessage = `User ${req.user.firstName} deleted user ${req.body.firstName}`
    audit.logEvent(eventMessage, req)
    
    res.status(200).send({ 'message': 'deleted successfully' })
})

function validateInput(body, type) {
    let schema
    switch (type) {
        case constants.CREATE:
            schema = joi.object().keys({
                role: joi.string().valid('admin', 'branch', 'superadmin').required(),
                branch: joi.string().alphanum().length(20).required(),
                firstName: joi.string().min(1).max(30).required(),
                lastName: joi.string().min(1).max(30).required(),
                contact: joi.string().required(),
                isActive: joi.bool().required(),
                email: joi.string().email({ minDomainSegments: 2 }).required()
            })
            break
        case constants.UPDATE:
            schema = joi.object().keys({
                id: joi.string().alphanum().min(28).required(),
                role: joi.string().valid('admin', 'branch', 'superadmin').required(),
                branch: joi.string().alphanum().length(20).required(),
                firstName: joi.string().min(1).max(30),
                lastName: joi.string().min(1).max(30),
                contact: joi.string(),
                isActive: joi.bool(),
                email: joi.string().email({ minDomainSegments: 2 }),
                createdDate: joi.date(),
                lastUpdatedDate: joi.date()
            })
            break
    }
    return validate(schema, body)
}

module.exports = router

/*
Trigger on users collection
Updates the users info in branch collection for every create, update, delete of users in users collection
*/
module.exports.modifyUsers = functions.firestore
    .document(`/${constants.USERS}/{userId}`)
    .onWrite(async (change, context) => {
        if (!change.before._fieldsProto) {
            await addUserToBranch(change.after)
        } else if (!change.after._fieldsProto) {
            await deleteUserFromBranch(change.before)
        } else {
            var oldData = change.before.data()
            var newData = change.after.data()
            if (oldData.branch !== newData.branch) {
                await deleteUserFromBranch(change.before)
                await addUserToBranch(change.after)
            }else if(oldData.firstName !== newData.firstName || newData.lastName !== newData.lastName){
                await updateUserInBranch(change.after)
            }
        }
    })

async function addUserToBranch(user) {
    try {
        var { firstName, lastName, branch } = user.data()
        const branchRef = db.doc(`${constants.BRANCHES}/${branch}`)
        const doc = await branchRef.get()
        // Check if branch is present in the collection
        if (!doc.exists) {
            throw new Error(`Branch ${branch} is not present in firestore!!!!`)
        }
        const user = `${firstName} ${lastName}`
        const users = doc.data().users
        users.push(user)
        await branchRef.update({ users })
        console.log(`Added ${user} to ${branch}`)
    }
    catch (error) {
        console.log(error)
    }
}

async function deleteUserFromBranch(user) {
    try {
        var { firstName, lastName, branch } = user.data()
        const branchRef = db.doc(`${constants.BRANCHES}/${branch}`)
        const doc = await branchRef.get()
        // Check if branch is present in the collection
        if (!doc.exists) {
            throw new Error(`Branch ${branch} is not present in firestore!!!!`)
        }
        const user = `${firstName} ${lastName}`
        const users = doc.data().users
        var index = users.indexOf(user)
        if (index > -1) {
            users.splice(index, 1)
            await branchRef.update({ users })
            console.log(`Deleted ${user} from ${branch}`)
        }
    }
    catch (error) {
        console.log(error)
    }
}

async function updateUserInBranch(user){
    try {
        var { firstName, lastName, branch } = user.data()
        const branchRef = db.doc(`${constants.BRANCHES}/${branch}`)
        const doc = await branchRef.get()
        // Check if branch is present in the collection
        if (!doc.exists) {
            throw new Error(`Branch ${branch} is not present in firestore!!!!`)
        }
        const user = `${firstName} ${lastName}`
        const users = doc.data().users
        var index = users.indexOf(user)
        if (index > -1) {
            users[index] = user
            await branchRef.update({ users })
            console.log(`Updated ${user} in ${branch}`)
        }
    }
    catch (error) {
        console.log(error)
    }
}