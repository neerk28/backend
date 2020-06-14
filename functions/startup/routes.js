const express = require('express');
const categories = require('../api/category');
const products = require('../api/product');
const operations = require('../api/operation');
const thresholds = require('../api/threshold');
const httperror = require('../middleware/httperror');
module.exports = function(app) {
    app.use(express.json());
    app.use(express.urlencoded({extended: true}));
    app.use('/api/categories', categories);
    app.use('/api/products', products);
    app.use('/api/operations', operations);
    app.use('/api/thresholds', thresholds);
    app.use(httperror);
}