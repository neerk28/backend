const logger = require('./logger');
module.exports = function(err, request, response, next) {
    logger.error("Internal Server Error");
    response.status(500).send(err.details);
    next();
}