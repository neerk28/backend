const express = require('express');
const categories = require('../api/category');
const httperror = require('../middleware/httperror');
module.exports = function(app) {
    app.use(express.json());
    app.use(express.urlencoded({extended: true}));
    app.use('/api/categories', categories);
    app.use(httperror);
}