const logger = require('../middleware/logger');
const config = require('config');
const joi = require('@hapi/joi');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const router = express.Router();
const cors = require('cors');
const db = admin.firestore();

router.get("/timestamp", (request, response) => {
    response.send(`Hello from Firebase! at ${Date.now()}`);
});


router.get('/', async (request, response) => {
    try {
        const snapshot = await db.doc('category/food').get();
        console.log(snapshot.data());
        response.send(snapshot.data());
    } catch (err) {
        console.log(err);
        response.send(err);
    }
});

// router.post('/', async (request, response, next) => {
//     const schema = joi.object({
//         name: joi.string()
//             .min(1)
//             .max(30)
//             .required(),
//         description: joi.string()
//             .min(1)
//             .max(30)
//             .required()
//     })
//     const {error} = validateParams(schema, request.body)
//     if(error) {
//         response.status(400).send(error.details[0].message)
//         return;
//     }

//     try {
//         let data = {
//             name: request.body.name,
//             description: request.body.description,
//             isActive: true,
//             products: [],
//             created_date: `${Date.now()}`,
//             last_updated: `${Date.now()}`
//         }
//         await db.collection('category').doc(data.name).set(datadsfds)
//         console.log(`${data.name} document Created`)
//         response.status(200).json(`${data.name} document Created`);
//     } catch(err) {
//         next(err);
//     }
// });

router.post('/', async (request, response, next) => {
    logger.info('Creating category in firestore....');
    logger.debug('validating params');
    const schema = joi.object({
        name: joi.string()
            .min(1)
            .max(30)
            .required(),
        description: joi.string()
            .min(1)
            .max(30)
            .required()
    })
    logger.debug('validating params');
    const { error } = validateParams(schema, request.body)
    if (error) {
        response.status(400).send(error.details[0].message)
        return;
    }
    logger.debug('validated params');
    let data = {
        name: request.body.name,
        description: request.body.description,
        isActive: true,
        products: [],
        created_date: `${Date.now()}`,
        last_updated: `${Date.now()}`
    }
    await db.collection('category').doc(data.name).set(data)
    console.log(`${data.name} document Created`)
    response.status(200).json(`${data.name} document Created`);
});


router.put('/status/:name', (request, response, next) => {
    const schema = joi.object({
        description: joi.string()
            .min(1)
            .max(30),
        status: joi.bool()
            .required()
    })
    const { error } = validateParams(schema, request.body)
    if (error) {
        response.status(400).send(error.details[0].message)
        return;
    }
    response
        .status(200)
        .send(`Updating status of category ${request.params.name} to ${request.body.status}`);
})

function validateParams(schema, body) {
    return schema.validate(body);
}

module.exports = router;