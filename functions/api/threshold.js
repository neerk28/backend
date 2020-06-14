const constants = require('../config/constants')
const validate = require('../validation/validation')
const logger = require('../middleware/logger');
const config = require('config');
const joi = require('@hapi/joi');
const admin = require('firebase-admin');
const express = require('express');
const router = express.Router();
const cors = require('cors');
const db = admin.firestore();

/**
 * @description Route to retireve threshold for all products from firestore
 * @returns Json object containing threshold for all products
 */
router.get("/", async (request, response, next) => {
    logger.info("Retrieving threshold for all products from firestore");
    const thresholds = {
        "thresholds": []
    }
    let thresholdCollection = db.collection(constants.THRESHOLD);
    let snapshot = await thresholdCollection.get()
    snapshot.forEach(threshold => {
        var thresholdInfo = {}
        var thresholdData = threshold.data()
        thresholdInfo[constants.PRODUCT] = threshold.id
        thresholdInfo[constants.CATEGORY] = thresholdData.category
        thresholdInfo[constants.UNIT] = thresholdData.unit
        thresholdInfo[constants.THRESHOLDS] = thresholdData.thresholds
        thresholdInfo[constants.CREATED_DATE] = thresholdData.createdDate.toDate()
        thresholdInfo[constants.LAST_UPDATED_DATE] = thresholdData.lastUpdatedDate.toDate()
        thresholds.thresholds.push(thresholdInfo);
    })
    thresholds[constants.TOTAL_PRODUCTS] = snapshot.size;
    logger.debug('Returning threshold for all products to client.');
    response.status(200).send(thresholds);
});

/**
 * @description Route to retrieve threshold for single product from firestore
 * @returns Json object containing requested threshold for a product
 * @throws 400 if the product does not exists in firestore
 */
router.get('/:product', async (request, response, next) => {
    var  requestedProduct = request.params.product.toLocaleLowerCase()
    logger.info(`Retrieving threshold for product ${requestedProduct} from firestore`)
    var thresholdInfo = {}
    const doc = db.collection(constants.THRESHOLD).doc(requestedProduct);
    const product = await doc.get()
    if (!product.exists) {
        const error = new Error(`Requested product ${requestedProduct} is not present in Firestore.`)
        error.statusCode = 404
        next(error)
        return;
    }
    var thresholdData = product.data()
    thresholdInfo[constants.PRODUCT] = product.id,
    thresholdInfo[constants.CATEGORY] = thresholdData.category
    thresholdInfo[constants.UNIT] = thresholdData.unit
    thresholdInfo[constants.THRESHOLDS] = thresholdData.thresholds
    thresholdInfo[constants.CREATED_DATE] = thresholdData.createdDate.toDate()
    thresholdInfo[constants.LAST_UPDATED_DATE] = thresholdData.lastUpdatedDate.toDate()
    logger.debug(`Returning details of  threshold for product ${requestedProduct} to client.`);
    response.status(200).send(thresholdInfo);
});

/**
 * @description Route to retrieve threshold for single product for a particular branch
 * @returns Json object containing requested threshold for a product for a particular branch
 * @throws 400 if the product does not exists in firestore
 */
router.get('/:product/:branch', async (request, response, next) => {
    var  requestedProduct = request.params.product.toLocaleLowerCase()
    var  branch = request.params.branch.toLocaleLowerCase()
    logger.info(`Retrieving threshold for product ${requestedProduct} for branch ${branch}`)
    var thresholdInfo = {}
    const doc = db.collection(constants.THRESHOLD).doc(requestedProduct);
    const product = await doc.get()
    if (!product.exists) {
        const error = new Error(`Requested product ${requestedProduct} is not present in Firestore.`)
        error.statusCode = 404
        next(error)
        return;
    }

    let threshold = {}
    var thresholdData = product.data()
    thresholdInfo[constants.PRODUCT] = product.id,
    thresholdInfo[constants.CATEGORY] = thresholdData.category
    thresholdInfo[constants.UNIT] = thresholdData.unit
    for( let [key, value] of Object.entries(thresholdData.thresholds)) {
        if( key == branch) {
            threshold[branch] = value
        }
    }
    thresholdInfo[constants.THRESHOLDS] = threshold
    thresholdInfo[constants.CREATED_DATE] = thresholdData.createdDate.toDate()
    thresholdInfo[constants.LAST_UPDATED_DATE] = thresholdData.lastUpdatedDate.toDate()
    logger.debug(`Returning details of threshold for product ${requestedProduct} for branch ${branch} to client.`);
    response.status(200).send(thresholdInfo);
});

/**
 * @description Route to retrieve threshold for all product in a category
 * @returns Json object containing threshold for all product in a category
 */
router.get('/products/category/:category', async (request, response, next) => {
    const thresholds = {
        "thresholds": []
    }
    var  category = request.params.category.toLocaleLowerCase()
    logger.info(`Retrieving threshold for all products in category ${category} from firestore`)
    const thresholdRef = db.collection(constants.THRESHOLD)
        .where(constants.CATEGORY, '==', category)
    const thresholdSnapshot = await thresholdRef.get()
    thresholdSnapshot.forEach(snapshot => {
        var thresholdData = snapshot.data()
        var thresholdInfo = {}
        thresholdInfo[constants.PRODUCT] = snapshot.id,
        thresholdInfo[constants.CATEGORY] = thresholdData.category
        thresholdInfo[constants.UNIT] = thresholdData.unit
        thresholdInfo[constants.THRESHOLDS] = thresholdData.thresholds
        thresholdInfo[constants.CREATED_DATE] = thresholdData.createdDate.toDate()
        thresholdInfo[constants.LAST_UPDATED_DATE] = thresholdData.lastUpdatedDate.toDate()
        thresholds.thresholds.push(thresholdInfo)
    })
    
    logger.debug(`Returning threshold for all products in category ${category} to client.`);
    response.status(200).send(thresholds);
});

/**
 * @description Route to retrieve threshold for all product in a category
 * @returns Json object containing threshold for all product in a category
 */
router.get('/all/products/branch/:branch', async (request, response, next) => {
    const thresholds = {
        "thresholds": []
    }
    var  branch = request.params.branch.toLocaleLowerCase()
    logger.info(`Retrieving threshold for all products in branch ${branch} from firestore`)
    const thresholdRef = db.collection(constants.THRESHOLD)
    const thresholdSnapshot = await thresholdRef.get()
    thresholdSnapshot.forEach(snapshot => {
        var thresholdData = snapshot.data()
        var thresholdInfo = {}
        let threshold = {}
        for( let [key, value] of Object.entries(thresholdData.thresholds)) {
            if( key == branch) {
                threshold[branch] = value
                thresholdInfo[constants.PRODUCT] = snapshot.id,
                thresholdInfo[constants.CATEGORY] = thresholdData.category
                thresholdInfo[constants.UNIT] = thresholdData.unit
                thresholdInfo[constants.THRESHOLDS] = threshold
                thresholdInfo[constants.CREATED_DATE] = thresholdData.createdDate.toDate()
                thresholdInfo[constants.LAST_UPDATED_DATE] = thresholdData.lastUpdatedDate.toDate()
                thresholds.thresholds.push(thresholdInfo)
            }
        }
    })
    
    logger.debug(`Returning threshold for all products in branch ${branch} to client.`);
    response.status(200).send(thresholds);
});

/**
 * @description Route to add thresholds for mutiple branches in Firestore
 * @returns Created thresholds
 * @throws 400 if threshold for product already exists or if required params are missing
 */
router.post('/', async (request, response, next) => {
    logger.info(`Creating threshold in firestore....`);
    // Validate parameters
    logger.debug('Validating params.')
    const { error } = validateParams(request.body, constants.ADD)
    if (error) {
        const err = new Error(error.details[0].message)
        err.statusCode = 400
        next(err)
        return;
    }

    // If threshold already exists, return 400
    var productName = request.body.product.toLocaleLowerCase()
    logger.info(`Creating threshold for product ${productName} in firestore....`);
    const doc = db.collection(constants.THRESHOLD).doc(productName);
    const product = await doc.get()
    if (product.exists) {
        const err = new Error(`The threshold for product ${productName} already exists. Please update if needed.`)
        err.statusCode = 400
        next(err)
        return;
    }
    let data = {}
    data[constants.CATEGORY] = request.body.category.toLocaleLowerCase()
    data[constants.UNIT] = request.body.unit.toLocaleLowerCase()
    data[constants.THRESHOLDS] = request.body.thresholds
    data[constants.CREATED_DATE] = new Date()
    data[constants.LAST_UPDATED_DATE] = new Date()
    await db.collection(constants.THRESHOLD).doc(productName).set(data)
    var result = {}
    result[constants.PRODUCT] = productName
    result[constants.CATEGORY] = data.category
    result[constants.UNIT] = data.unit
    result[constants.THRESHOLDS] = data.thresholds
    logger.debug(`${productName} document created in Threshold collection`)
    response.status(200).send(result);    
});

/**
 * @description Route to update thresholds of product
 * @returns  updated product
 * @throws 400 if product does not exist or has wrong params
 */
router.put('/', async (request, response, next) => {
    logger.info(`Updating threshold for product in firestore....`);
    
    // Validate parameters
    const { error } = validateParams(request.body, constants.UPDATE)
    if (error) {
        const err = new Error(error.details[0].message)
        err.statusCode = 400
        next(err)
        return;
    }

    // If product does not exists, return 400
    var productName = request.body.product.toLocaleLowerCase()
    logger.info(`Updating threshold for product ${productName} in firestore....`);
    const productRef = db.collection(constants.THRESHOLD).doc(productName);
    const product = await productRef.get()
    if (!product.exists) {
        const err = new Error(`Requested product ${productName} is not present in Firestore.`)
        err.statusCode = 404
        next(err)
        return;
    }
    let data = product.data();
    const thresholdsToUpdate = request.body.thresholds
    Object.keys(thresholdsToUpdate).forEach(key => {
        data[constants.THRESHOLDS][key] = thresholdsToUpdate[key];
    }) 
    await productRef.update({
        thresholds: data[constants.THRESHOLDS], 
        lastUpdatedDate: `${new Date()}` 
    })
    
    var result = {}
    result[constants.PRODUCT] = productName
    result[constants.THRESHOLDS] = data[constants.THRESHOLDS]
    logger.debug(`Updated threshold of product ${productName}`)
    response.status(200).send(result);
})

/**
 * @description Route to delete thresholds
 * @returns  deleted threshold
 * @throws 400 if threshold for product does not exist
 */
router.delete('/:product', async(request, response, next) => {
    var  productName = request.params.product.toLocaleLowerCase()
    logger.info(`Deleting threshold for product ${productName} from firestore`)
    
    const productRef = db.collection(constants.THRESHOLD).doc(productName);
    const product = await productRef.get()
    if (!product.exists) {
        const error = new Error(`Threshold for product ${productName} is not present in Firestore.`)
        error.statusCode = 404
        next(error)
        return;
    }
    let data = {}
    const productData = product.data()
    console.log(productData)
    data[constants.PRODUCT] = productName
    data[constants.CATEGORY] = productData.category
    data[constants.UNIT] = productData.unit
    data[constants.THRESHOLDS] = productData.thresholds
    
    await productRef.delete()
    logger.debug(`Deleted threshold for product ${productName}`)
    response
        .status(200)
        .send(data);
})

/**
  * Validates the request body.
  * @param {*} body request body
  * @param {*} type identifier to determine which request is to be validated
  *         product for create product
  *         description for updating description
  *         status for updating status
  *         status for updating unit
  */
 function validateParams(body, type) {
    let schema;
    switch(type) {
        case constants.ADD:
            schema = joi.object({
                product: joi.string()
                    .min(1)
                    .max(30)
                    .required(),
                category: joi.string()
                    .min(1)
                    .max(30)
                    .required(),
                unit: joi.string()
                    .min(1)
                    .max(30)
                    .required(),
                thresholds: joi.object()
                    .min(1)
                    .required()
            })
            break
        case  constants.UPDATE:
            schema = joi.object({
                product: joi.string()
                    .min(1)
                    .max(30)
                    .required(),
                thresholds: joi.object()
                    .min(1)
                    .required()
            })
            break
    }
    return validate(schema, body)
}

module.exports = router;